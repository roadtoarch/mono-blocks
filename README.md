# mono-blocks

> A small, opinionated full-stack starter for a React + Spring Boot API over a generic, domain-agnostic entities / relationships / events schema.

<p align="center">
  <img src="https://raw.githubusercontent.com/roadtoarch/mono-blocks/HEAD/docs/architecture-flow.svg" alt="Architecture flow from the React browser client through the Spring Boot API to PostgreSQL." width="100%">
</p>

<p align="center">
  <a href="docs/architecture.html">Interactive architecture diagram</a> — full component map
</p>

The first useful loop is already in place: a generic CRUD API over one `entities` table with free-form `attributes`, typed `relationships`, and an append-only `events` timeline. Nothing is hardcoded to a single domain — the API stays generic over `entity_type` and `relationship_type` strings, so the same backend serves a CRM, an asset tracker, or a scheduling tool.

## At A Glance

| Layer     | What is ready                                                             | Where to look        |
| --------- | ------------------------------------------------------------------------- | -------------------- |
| Browser   | React 19, Vite 8, TypeScript 6, TanStack Query/Router                     | `frontend/`          |
| API       | Spring Boot 4.1, Java 21, generic entities/relationships/events REST API   | `backend/`           |
| Data      | PostgreSQL 16 with PostGIS 3.4, JPA, Flyway, JSONB, full-text search      | `docker-compose.yml` |
| Test data | Fictional business-scenario seed for the generic core                     | `db/seed/`           |

## Start Here

### Prerequisites

- Docker with Compose
- Node.js `>=22.19.0`
- JDK 21

### 1. Start infrastructure

From the repository root:

```bash
cp .env.example .env
docker compose up -d
```

This starts PostgreSQL with PostGIS on `localhost:5432`. The API's schema is created by Flyway on first boot; no manual migration step is required.

### 2. Start the API

In a second terminal:

```bash
cd backend
./mvnw spring-boot:run
```

The API listens on `http://localhost:8080`, and its schema is applied automatically.

### 3. Start the frontend

In a third terminal:

```bash
cp frontend/.env.example frontend/.env
cd frontend
yarn install
yarn dev
```

The frontend reads `VITE_API_URL` from `frontend/.env` via a Zod-validated `src/env.ts`. The default is `http://localhost:8080`.

Open `http://localhost:5173` to use the frontend.

## Generic Core API

The API is a thin, domain-agnostic layer over three tables: `entities`, `relationships`, and `events`. Every endpoint is unauthenticated by design — there is no security scaffold to dismantle before you add your own.

`entity_type`, `relationship_type`, and `event_type` are free-form strings, so the same API supports a CRM, an asset tracker, or a scheduling tool without a code change.

### Entities

| Method   | Path                         | Notes                                                                                                                                    |
| -------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/entities`              | Paged list. Filters: `entity_type`, `status`, `tag`, `search`, `lat`/`lng`/`radius_km`, `min_lat`/`min_lng`/`max_lat`/`max_lng`. Sorting via `sort=field,dir`. |
| `GET`    | `/api/entities/{id}`         | Single entity plus a paged `children` list (entities whose `parent_id` is this id).                                                        |
| `GET`    | `/api/entities/types`        | Distinct `entity_type` values seen so far.                                                                                                 |
| `GET`    | `/api/entities/check-unique` | Attribute-uniqueness check (`entity_type`, `key`, `value`, optional `excludeId`).                                                          |
| `POST`   | `/api/entities`              | Create. `entity_type` and `name` are required.                                                                                             |
| `PUT`    | `/api/entities/{id}`         | Full replace.                                                                                                                              |
| `PATCH`  | `/api/entities/{id}`         | Partial update (attributes are merged, not replaced).                                                                                      |
| `DELETE` | `/api/entities/{id}`         | Delete.                                                                                                                                    |

### Relationships and events

| Method   | Path                               | Notes                                                                                                     |
| -------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/entities/{id}/relationships` | Every edge where the entity is source or target, each with a `direction` (`outbound`/`inbound`).           |
| `POST`   | `/api/relationships`               | Create an edge. `source_id == target_id` is rejected.                                                      |
| `DELETE` | `/api/relationships/{id}`          | Delete an edge.                                                                                            |
| `GET`    | `/api/entities/{id}/events`        | This entity's timeline, newest first.                                                                      |
| `GET`    | `/api/events`                      | Global feed. Filters: `event_type`, `entity_type`, and an `occurred_at` date range.                        |
| `POST`   | `/api/events`                      | Append an event. Events are immutable — there is no update or delete.                                      |

### Example calls

```bash
# Create a customer; any unknown top-level key lands in attributes
curl -s -X POST http://localhost:8080/api/entities \
  -H 'Content-Type: application/json' \
  -d '{"entity_type":"customer","name":"Acme Corp","status":"active",
       "tags":["vip"],"billing_email":"billing@acme.test","tier":"premium"}'

# List customers matching "Acme", ten per page
curl -s 'http://localhost:8080/api/entities?entity_type=customer&search=Acme&page=0&size=10'

# Entities within 25 km of downtown Vancouver
curl -s 'http://localhost:8080/api/entities?lat=49.28&lng=-123.12&radius_km=25'

# Link a work order to a technician
curl -s -X POST http://localhost:8080/api/relationships \
  -H 'Content-Type: application/json' \
  -d '{"source_id":"<work-order-id>","target_id":"<technician-id>","relationship_type":"assigned_to"}'

# Append a status-change event
curl -s -X POST http://localhost:8080/api/events \
  -H 'Content-Type: application/json' \
  -d '{"entity_id":"<id>","event_type":"status_changed","payload":{"from":"open","to":"scheduled"}}'
```

`attributes` is a free-form JSON object. Responses expose it both nested (under `attributes`) and flattened at the top level, so `billing_email` above is also readable as `$.billing_email`. `location` is plain `{ lat, lng }` — never GeoJSON or WKT. Attribute keys named after a fixed column (`name`, `status`, …) are rejected with `400`.

OpenAPI/Swagger UI is enabled at `http://localhost:8080/swagger-ui.html`. Errors use a consistent RFC 7807 shape: `400` validation with an `errors` map, `404` not found, and `409` conflict.

Attribute uniqueness is enforced in the database: register a key in `pgcj.unique_attributes` (seeded with `customer.billing_email`, `equipment.serial_number`, and `technician.email`) and a trigger rejects duplicates with `409`.

## Operations

The backend exposes these unauthenticated observability endpoints:

| Endpoint                | Purpose                       |
| ----------------------- | ----------------------------- |
| `GET /actuator/health`  | Health check                  |
| `GET /actuator/metrics` | Prometheus-compatible metrics |

The development frontend origin is `http://localhost:5173`. The backend can be configured through environment variables, including `SERVER_PORT`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DATABASE`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `FRONTEND_URL`.

For a containerized deployment profile, run the backend with:

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

## Seed Demo Data

`backend/src/main/resources/db/seed/demo_scenario.sql` loads a small, coherent fictional business scenario into the generic core: **Northline Facilities Group**, a Metro Vancouver commercial facilities operator, with 5 customers, 10 sites, 20 pieces of equipment, 5 technicians, 24 work orders, and ~60 events spread across the last 60 days. The scenario — entity types, attribute shapes, the `assigned_to` relationship, and event payloads — is documented in [`docs/demo-scenario.md`](docs/demo-scenario.md).

Apply it once the schema exists (i.e. after the backend has booted once so Flyway has run):

```bash
psql "postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DATABASE?currentSchema=pgcj" \
  -v ON_ERROR_STOP=1 \
  -f backend/src/main/resources/db/seed/demo_scenario.sql
```

The file uses fixed UUIDs and conflict/no-op guards, so it is safe to re-apply — a second run inserts nothing. It is deliberately kept out of `db/migration/`: the integration test suite asserts exact row counts against a freshly migrated database.

## Project Shape

```text
mono-blocks/
├── backend/                 # Spring Boot API over the generic schema
│   └── src/main/resources/db/seed/   # Demo scenario seed (SQL)
├── frontend/                # React SPA
├── docs/demo-scenario.md    # The fictional business scenario
├── docs/architecture-flow.svg
├── docker-compose.yml       # PostgreSQL/PostGIS
└── .env.example             # Local infrastructure defaults
```

## What You Add Next

The backend ships a working generic core: entities, relationships, events, filtering, search, geospatial queries, and attribute uniqueness. What it deliberately does not include is opinion — no domain-specific entities, DTOs, or authorization rules.

Typical next steps are:

- Seed the tables with the demo business scenario (`backend/src/main/resources/db/seed/demo_scenario.sql`, described in `docs/demo-scenario.md`).
- Add your own `entity_type` / `relationship_type` conventions and attribute schemas.
- Register additional unique attribute keys in `pgcj.unique_attributes`.
- Add authentication and authorization if your use case requires it.
- Add frontend tests and a production deployment configuration.

## Verify Changes

Frontend checks run from `frontend/`:

```bash
yarn lint
yarn build
```

Backend checks run from `backend/`:

```bash
./mvnw test
```

The backend integration tests start PostgreSQL with PostGIS via Testcontainers, so Docker must be running. Interactive API docs are available at `http://localhost:8080/swagger-ui.html` once the API is up.

## License

Released under the [MIT License](LICENSE).