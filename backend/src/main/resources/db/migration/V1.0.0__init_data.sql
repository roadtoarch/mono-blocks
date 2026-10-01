-- Generic polymorphic core: entities / relationships / events.
-- Domain-neutral by design: everything domain-specific lives in entity_type
-- strings and the free-form `attributes` jsonb bag.
--
-- Idempotent / re-runnable: every statement uses IF NOT EXISTS or CREATE OR
-- REPLACE, so applying this file again is a no-op (it does not error).

CREATE EXTENSION IF NOT EXISTS postgis;
-- gen_random_uuid() is core since PostgreSQL 13; pgcrypto is NOT required on the
-- PostGIS 16-3.4 / PostgreSQL 16 target.

CREATE SCHEMA IF NOT EXISTS pgcj;

-- ---------------------------------------------------------------------------
-- entities
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pgcj.entities (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type   TEXT NOT NULL,
    parent_id     UUID REFERENCES pgcj.entities(id) ON DELETE SET NULL,
    owner_id      UUID,
    name          TEXT NOT NULL,
    description   TEXT,
    status        TEXT NOT NULL DEFAULT 'active',
    tags          TEXT[] NOT NULL DEFAULT '{}',
    location      geography(POINT, 4326),
    attributes    JSONB NOT NULL DEFAULT '{}',
    search        TSVECTOR GENERATED ALWAYS AS (
                      to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
                  ) STORED,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entities_type   ON pgcj.entities (entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_parent ON pgcj.entities (parent_id);
CREATE INDEX IF NOT EXISTS idx_entities_attrs  ON pgcj.entities USING GIN (attributes);
CREATE INDEX IF NOT EXISTS idx_entities_tags   ON pgcj.entities USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_entities_search ON pgcj.entities USING GIN (search);
CREATE INDEX IF NOT EXISTS idx_entities_geo    ON pgcj.entities USING GIST (location);

-- ---------------------------------------------------------------------------
-- relationships
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pgcj.relationships (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id         UUID NOT NULL REFERENCES pgcj.entities(id) ON DELETE CASCADE,
    target_id         UUID NOT NULL REFERENCES pgcj.entities(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL,
    attributes        JSONB NOT NULL DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_relationship    UNIQUE (source_id, target_id, relationship_type),
    CONSTRAINT ck_relationship_no_self CHECK (source_id <> target_id)
);

CREATE INDEX IF NOT EXISTS idx_relationships_source ON pgcj.relationships (source_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON pgcj.relationships (target_id);

-- ---------------------------------------------------------------------------
-- events (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pgcj.events (
    id          BIGSERIAL PRIMARY KEY,
    entity_id   UUID REFERENCES pgcj.entities(id) ON DELETE CASCADE,
    actor_id    UUID,
    event_type  TEXT NOT NULL,
    payload     JSONB NOT NULL DEFAULT '{}',
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_entity ON pgcj.events (entity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type   ON pgcj.events (event_type);

-- ---------------------------------------------------------------------------
-- attribute uniqueness registry (domain-neutral)
-- A row here declares that `attributes->>attribute_key` must be unique among
-- live rows of the given entity_type. Enforcement is by trigger below so that
-- SQL-seeded data obeys the constraint too, not only JPA writes.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pgcj.unique_attributes (
    entity_type   TEXT NOT NULL,
    attribute_key TEXT NOT NULL,
    PRIMARY KEY (entity_type, attribute_key)
);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pgcj.set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_entities_updated_at
    BEFORE UPDATE ON pgcj.entities
    FOR EACH ROW EXECUTE FUNCTION pgcj.set_updated_at();

-- ---------------------------------------------------------------------------
-- attribute uniqueness enforcement
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pgcj.enforce_attribute_uniqueness() RETURNS trigger AS $$
DECLARE
    reg   RECORD;
    value TEXT;
BEGIN
    FOR reg IN
        SELECT attribute_key FROM pgcj.unique_attributes WHERE entity_type = NEW.entity_type
    LOOP
        IF NEW.attributes ? reg.attribute_key THEN
            value := NEW.attributes ->> reg.attribute_key;
            IF value IS NOT NULL AND value <> '' THEN
                -- Serialize concurrent writers of the same (type, key, value) so
                -- the EXISTS probe below cannot race (R8).
                PERFORM pg_advisory_xact_lock(hashtext(NEW.entity_type || '|' || reg.attribute_key || '|' || value));
                IF EXISTS (
                    SELECT 1
                    FROM pgcj.entities e
                    WHERE e.entity_type = NEW.entity_type
                      AND e.id <> NEW.id
                      AND e.attributes ->> reg.attribute_key = value
                ) THEN
                    RAISE EXCEPTION 'unique attribute violation: %.% = %',
                        NEW.entity_type, reg.attribute_key, value
                        USING ERRCODE = 'unique_violation';
                END IF;
            END IF;
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_entities_unique_attributes
    BEFORE INSERT OR UPDATE OF attributes, entity_type ON pgcj.entities
    FOR EACH ROW EXECUTE FUNCTION pgcj.enforce_attribute_uniqueness();

-- ---------------------------------------------------------------------------
-- registry seed (approved keys — D11). Remove a row to relax enforcement.
-- ---------------------------------------------------------------------------
INSERT INTO pgcj.unique_attributes (entity_type, attribute_key) VALUES
    ('customer',  'billing_email'),
    ('equipment', 'serial_number'),
    ('technician','email')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- full-text search helper
-- Wraps the stored `search` tsvector (and therefore the GIN index) so the JPA
-- Specification layer can express tsvector matching via a Criteria function
-- without mapping the generated column. Never uses LIKE.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fts_match(entity_id uuid, query text) RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1
        FROM pgcj.entities e
        WHERE e.id = entity_id
          AND e.search @@ plainto_tsquery('english', query)
    );
$$ LANGUAGE sql STABLE;

-- ---------------------------------------------------------------------------
-- geospatial helpers
-- Same rationale as fts_match: let the JPA Specification layer express
-- PostGIS predicates through a Criteria function while the GIST index on
-- `location` still does the work. `lat`/`lng` are WGS-84 degrees; radius is km.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.geo_within_radius(
    entity_id  uuid,
    center_lat numeric,
    center_lng numeric,
    radius_km  numeric
) RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1
        FROM pgcj.entities e
        WHERE e.id = entity_id
          AND e.location IS NOT NULL
          AND ST_DWithin(
                  e.location,
                  ST_SetSRID(
                      ST_MakePoint(center_lng::double precision, center_lat::double precision),
                      4326
                  )::geography,
                  radius_km::double precision * 1000.0
              )
    );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.geo_within_bbox(
    entity_id uuid,
    min_lat   numeric,
    min_lng   numeric,
    max_lat   numeric,
    max_lng   numeric
) RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1
        FROM pgcj.entities e
        WHERE e.id = entity_id
          AND e.location IS NOT NULL
          AND ST_Covers(
                  ST_MakeEnvelope(
                      min_lng::double precision,
                      min_lat::double precision,
                      max_lng::double precision,
                      max_lat::double precision,
                      4326
                  )::geography,
                  e.location
              )
    );
$$ LANGUAGE sql STABLE;

-- ---------------------------------------------------------------------------
-- tag containment helper
-- Lets the Specification layer filter by an array element without depending on
-- Hibernate's translation of `array_contains`. Uses the GIN(tags) index.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tags_contains(entity_id uuid, tag text) RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1
        FROM pgcj.entities e
        WHERE e.id = entity_id
          AND e.tags @> ARRAY[tag]
    );
$$ LANGUAGE sql STABLE;