# Demo Scenario — Northline Facilities Group

A fictional, deliberately boring business scenario used to seed the generic
`entities` / `relationships` / `events` core so the app can be demoed,
screenshotted, and written about with realistic data instead of
"Entity 1, Entity 2, Entity 3".

Nothing in this document is domain code. It is a *usage* of the generic
schema — every entity type, relationship type, and event type below is just a
string stored in a `text` column.

---

## 1. The company

**Northline Facilities Group** is a small commercial facilities operator in
Metro Vancouver. It signs maintenance contracts with building owners
(*customers*), services their buildings (*sites*), keeps equipment on those
sites running (*equipment*: HVAC units, elevators, boilers, pumps, backup
generators), employs field *technicians*, and does the actual work through
*scheduled jobs* (*work orders*).

The same data reads as three different products depending on what you
emphasise:

| Emphasis | Reads as |
|---|---|
| customers + contracts | a light CRM |
| equipment + site coordinates | asset tracking |
| work orders + statuses + events | a scheduling / ops tool |

### Personas

| Persona | Uses the app to |
|---|---|
| **Dispatcher** | see the work-order backlog, assign technicians, watch the activity feed |
| **Field technician** | check in at a site, record equipment readings, close jobs |
| **Account manager** | track customers and contract renewals, look up a customer's sites |
| **Operations lead** | watch the global activity feed and equipment status across sites |

---

## 2. Entity types

Five entity types. `name` and `status` are real columns; everything else lives
in `attributes` (jsonb) and is flattened to the top level of API responses.

Every row gets a `name` column value (the API requires it), even when the UI
displays a different attribute as the row title.

### `customer` — a building owner under contract

| Field | Where | Notes |
|---|---|---|
| `name` | column | e.g. `Harbourview Property Trust` |
| `status` | column | `active` \| `inactive` \| `prospective` |
| `billing_email` | attributes | **registered unique** per `customer` |
| `phone` | attributes | |
| `tier` | attributes | `standard` \| `premium` \| `enterprise` |
| `contract_start` | attributes | ISO date |

No `location` — customers are accounts, not places.

### `site` — a managed building

| Field | Where | Notes |
|---|---|---|
| `name` | column | e.g. `200 Granville Tower` |
| `status` | column | `active` \| `inactive` |
| `location` | **column** | non-null for all sites, `{lat, lng}` in the API |
| `address` | attributes | street address string |
| `city` | attributes | |
| `site_type` | attributes | `commercial` \| `residential` \| `retail` |
| `square_footage` | attributes | number |
| `customer_id` | attributes | UUID of the owning `customer` — mirrors `parent_id` for the current UI |

### `equipment` — an asset installed at a site

| Field | Where | Notes |
|---|---|---|
| `name` | column | same value as the serial number, so lists read sensibly |
| `status` | column | `operational` \| `maintenance` \| `down` |
| `location` | **column** | non-null for field/rooftop units, null for in-plant kit |
| `serial_number` | attributes | **registered unique** per `equipment`; also the UI row title |
| `equipment_type` | attributes | `hvac` \| `elevator` \| `boiler` \| `pump` \| `generator` |
| `site_id` | attributes | UUID of the host `site` — mirrors `parent_id` |
| `location_note` | attributes | free text, e.g. `Rooftop, north mechanical deck` |
| `install_date` | attributes | ISO date |
| `last_service_date` | attributes | ISO date |

### `technician` — a field employee

| Field | Where | Notes |
|---|---|---|
| `name` | column | e.g. `Dana Whitfield` |
| `status` | column | `available` \| `on_job` \| `off` |
| `email` | attributes | **registered unique** per `technician` |
| `phone` | attributes | |
| `skills` | attributes | array of strings, e.g. `["hvac", "controls"]` |
| `certification_level` | attributes | `I` \| `II` \| `III` \| `master` |

No `location` — technicians are tracked through the work they do, not a point.

### `work_order` — a scheduled job

| Field | Where | Notes |
|---|---|---|
| `name` | column | same value as `title` (API requires `name`) |
| `title` | attributes | UI row title, e.g. `Quarterly HVAC service` |
| `status` | column | `open` \| `scheduled` \| `in_progress` \| `completed` \| `cancelled` |
| `priority` | attributes | `low` \| `normal` \| `high` \| `urgent` |
| `scheduled_for` | attributes | ISO date |
| `site_id` | attributes | UUID of the `site` the job is at — mirrors `parent_id` |
| `technician_id` | attributes | UUID of the assigned `technician` — mirrors the `assigned_to` relationship |
| `location_note` | attributes | free text work location |
| `notes` | attributes | free text |

---

## 3. Relationships and hierarchy

The generic model offers two ways to link rows. This scenario keeps that
deliberately lopsided — the tree carries almost everything, and a single typed
relationship carries the one link that is not a containment.

### Hierarchy (`parent_id`)

```text
customer
└── site                 (site.parent_id        = customer.id)
    ├── equipment        (equipment.parent_id   = site.id)
    └── work_order       (work_order.parent_id  = site.id)
```

### Typed relationship (`relationships`)

| relationship_type | source | target | meaning |
|---|---|---|---|
| `assigned_to` | `work_order` | `technician` | the technician responsible for the job |

A work order belongs to its *site* (hierarchy) but is *assigned to* a
*technician* — a person can hold many work orders across many sites, so this
edge is not a containment and does not belong in `parent_id`.

**Compatibility note.** The current UI still has reference selects and columns
keyed on `customer_id`, `site_id`, and `technician_id`, so the seed also writes
those attribute keys with the same UUIDs as the canonical `parent_id` /
relationship rows. That is intentional double bookkeeping to keep the existing
screens rendering, and is a candidate for a follow-up where the frontend reads
links from `parent_id` and `relationships` only.

---

## 4. Event types

Events are append-only, carry `occurred_at`, an optional `actor_id`, and a free
`payload`. The types below are the ones the UI already offers as filters.

| Entity type | event_type | payload shape |
|---|---|---|
| `customer` | `contract_renewed` | `{"term_months": 24, "annual_value": 84000}` |
| `customer` | `tier_changed` | `{"from": "standard", "to": "premium"}` |
| `site` | `inspection_completed` | `{"inspector": "Dana Whitfield", "score": 92, "findings": 1}` |
| `equipment` | `reading_recorded` | `{"metric": "pressure_psi", "value": 61.4, "unit": "psi"}` |
| `equipment` | `service_completed` | `{"work_order_id": "<uuid>", "technician": "Sam Ortega"}` |
| `equipment` | `fault_reported` | `{"severity": "high", "code": "E-204", "description": "Coolant pressure below threshold"}` |
| `technician` | `checked_in` | `{"site_id": "<uuid>", "lat": 49.28, "lng": -123.12}` |
| `technician` | `certification_renewed` | `{"certification": "Refrigeration", "expires_on": "2028-04-01"}` |
| `work_order` | `status_changed` | `{"from": "scheduled", "to": "in_progress"}` |
| `work_order` | `assigned` | `{"technician_id": "<uuid>", "assigned_by": "Dispatcher"}` |
| `work_order` | `note_added` | `{"note": "Replacement belt ordered.", "author": "Sam Ortega"}` |

`actor_id` is left null for system-ish events (contract renewals, inspection
reports) and set to a technician UUID for field events.

---

## 5. Seed dataset

Applied once, manually, to a database that already has the generic schema.
Target volume:

| Entity type | Count | Notes |
|---|---|---|
| `customer` | 5 | mixed `tier`, one `prospective`, one `inactive` |
| `site` | 10 | all with coordinates in Metro Vancouver |
| `equipment` | 20 | mixed types/statuses, ~12 with coordinates |
| `technician` | 5 | mixed `certification_level` and `status` |
| `work_order` | 24 | mixed statuses and priorities, spread across sites |
| `relationships` | ~18 | `assigned_to` only |
| `events` | ~60 | spread over the last 60 days |

Geography: everything sits inside Metro Vancouver — latitude `49.15`–`49.35`,
longitude `-123.25`–`-122.85` — so the radius filter (`lat=49.28&lng=-123.12&
radius_km=25`) returns a meaningful subset rather than everything or nothing.

Statuses are spread so every filter and every tag/status colour in the UI has
something to show; the work-order mix deliberately includes `open`,
`scheduled`, `in_progress`, `completed`, and `cancelled`.

### Where the seed lives

`backend/src/main/resources/db/seed/demo_scenario.sql` — **not** under
`db/migration/`. It is applied by hand:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f backend/src/main/resources/db/seed/demo_scenario.sql
```

It must stay out of the Flyway migration path because the integration test
suite asserts exact table counts on a freshly migrated database; a versioned
migration would inject this data into every test run.

The SQL uses fixed UUID literals and `ON CONFLICT DO NOTHING` throughout so it
can be applied more than once without duplicating rows.