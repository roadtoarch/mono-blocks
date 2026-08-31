# mono-blocks

> A small, opinionated full-stack starter for building a tenant-aware React + Spring Boot application with Keycloak already wired in.

<p align="center">
  <img src="https://raw.githubusercontent.com/roadtoarch/mono-blocks/HEAD/docs/architecture-flow.svg" alt="Architecture flow from the React browser client through Keycloak and the Spring Boot API to PostgreSQL, including the tenant_id claim." width="100%">
</p>

The first useful loop is already in place: sign in from the browser, receive an OIDC token, call a protected API, validate the JWT, and carry `tenant_id` through the request. The domain is intentionally empty so you can add your own entities, routes, and business rules without dismantling a demo application first.

## At A Glance

| Layer     | What is ready                                                            | Where to look        |
| --------- | ------------------------------------------------------------------------ | -------------------- |
| Browser   | React 19, Vite 8, TypeScript 6, OIDC code flow with PKCE, silent renewal | `frontend/`          |
| Identity  | Keycloak 26.7.2, imported `forest` realm, demo users and tenant claims   | `keycloak/import/`   |
| API       | Spring Boot 4.1, Java 21, JWT resource server, `GET /api/me`             | `backend/`           |
| Data      | PostgreSQL 16 with PostGIS 3.4, JPA, Flyway plumbing                     | `docker-compose.yml` |
| Test data | Reproducible PostgreSQL SQL generation with Faker and YAML               | `sampler/`           |

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

This starts PostgreSQL on `localhost:5432` and Keycloak on `localhost:8081`. The `forest` realm is imported automatically from `keycloak/import/`.

### 2. Start the API

In a second terminal:

```bash
cd backend
./mvnw spring-boot:run
```

The API listens on `http://localhost:8080`.

### 3. Start the frontend

In a third terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`, choose **Sign in**, and use one of the demo accounts below.

## Demo Identity

The imported realm is named `forest`. Every demo user currently uses the temporary password `changeme`; replace these credentials before using the scaffold for anything real.

| Username | Role     | `tenant_id` |
| -------- | -------- | ----------: |
| `alice`  | `ADMIN`  |         `1` |
| `bob`    | `MEMBER` |         `1` |
| `carol`  | `MEMBER` |         `2` |

Keycloak admin console: `http://localhost:8081` with `admin` / `admin`.

## The Working Request

After signing in, the frontend calls the API with the access token:

```http
GET /api/me
Authorization: Bearer <access_token>
```

The endpoint returns identity and tenant context from the validated JWT:

```json
{
  "username": "alice",
  "email": "alice@example.test",
  "roles": ["ADMIN"],
  "tenant_id": "1"
}
```

The request path is deliberately small:

1. The browser redirects to Keycloak using authorization code flow with PKCE S256.
2. Keycloak returns ID and access tokens; the frontend stores them in local storage and renews them silently.
3. The frontend sends the access token to `GET /api/me`.
4. Spring Security validates the JWT against the Keycloak issuer.
5. `TenantFilter` copies `tenant_id` into a request-scoped `ThreadLocal` context.
6. `MeController` returns the authenticated username, email, authorities, and tenant.

<details>
<summary>View the full flow diagram</summary>

<p align="center">
  <img src="https://raw.githubusercontent.com/roadtoarch/mono-blocks/HEAD/docs/architecture-flow.svg" alt="Detailed OIDC request flow between the browser, Keycloak, Spring Boot API, tenant context, and PostgreSQL." width="100%">
</p>

</details>

## Operations

The backend exposes these unauthenticated observability endpoints:

| Endpoint                | Purpose                       |
| ----------------------- | ----------------------------- |
| `GET /actuator/health`  | Health check                  |
| `GET /actuator/metrics` | Prometheus-compatible metrics |

The development frontend origin is `http://localhost:5173`. The backend can be configured through environment variables, including `SERVER_PORT`, `KEYCLOAK_PORT`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DATABASE`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `FRONTEND_URL`.

For a containerized deployment profile, run the backend with:

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

## Generate Test Data

`sampler/` is a standalone `uv` script that turns a YAML specification into reproducible PostgreSQL SQL. The checked-in spec describes `10,000` users, `100,000` posts, and `500,000` comments, including weighted references and nested replies.

```bash
uv run sampler/generate_data.py \
  --config sampler/data-generation.yml \
  --output /tmp/mono-blocks.sql
```

Override the configured scale or seed when needed:

```bash
uv run sampler/generate_data.py \
  --config sampler/data-generation.yml \
  --output /tmp/mono-blocks-small.sql \
  --users 100 \
  --posts 500 \
  --comments 2000 \
  --seed 42
```

## Project Shape

```text
mono-blocks/
├── backend/                 # Spring Boot API and security boundary
├── frontend/                # React SPA and OIDC client
├── keycloak/import/         # Auto-imported realm configuration
├── sampler/                 # YAML-driven PostgreSQL data generator
├── docs/architecture-flow.svg
├── docker-compose.yml       # PostgreSQL/PostGIS + Keycloak
└── .env.example             # Local infrastructure defaults
```

## What You Add Next

The scaffold stops at the integration boundary on purpose. It does not yet include domain entities, Flyway migrations, business routes, frontend tests, or a production deployment configuration. Those are extension points, not hidden features.

Typical next steps are:

- Add domain tables and migrations under the backend.
- Replace the demo `/api/me` response with application resources.
- Enforce `ADMIN` and `MEMBER` authorization where domain rules require it.
- Add frontend component and end-to-end tests.
- Replace local demo credentials and configure production issuer, origins, and secrets.

## Verify Changes

Frontend checks run from `frontend/`:

```bash
npm run lint
npm run build
```

Backend checks run from `backend/`:

```bash
./mvnw test
```

## License

Released under the [MIT License](LICENSE).
