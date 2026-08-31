# mono-blocks

A minimal full-stack **quickstart scaffold**: React (Vite) frontend + Spring Boot backend, wired end to end with **Keycloak OIDC** auth and a single protected endpoint. Fork it, copy it, or tear out the pieces you don't need — it exists to give your next test project a fast starting point.

## What's inside

| Folder | What it is | Stack |
| --- | --- | --- |
| `frontend/` | SPA that signs in via OIDC and calls the API | React 19 · Vite 8 · TypeScript 6 · react-oidc-context · TanStack Query |
| `backend/` | Resource server exposing one protected endpoint | Spring Boot 4 · Java 21 · OAuth2 resource server · JPA · Flyway · Maven |
| `keycloak/` | Realm import, auto-loaded at startup | Keycloak 26 · dev mode (`--import-realm`) |
| `sampler/` | Postgres data-generation utility | uv + Python · Faker |

The pieces actually wired up today: compose-based **Postgres/PostGIS** + **Keycloak**, OIDC auth code flow with PKCE from the browser, JWT validation on the API side, a `tenant_id` claim propagated through a per-request filter, and one endpoint that round-trips it back. Everything else (routing, tables, business logic) is intentionally blank — that's what you add.

## How auth flows

<p align="center">
  <img src="https://raw.githubusercontent.com/roadtoarch/mono-blocks/HEAD/docs/architecture-flow.svg" alt="OIDC architecture diagram: React SPA signs in against Keycloak (code flow + PKCE), calls the Spring Boot API with a bearer JWT, which validates the token against Keycloak and reads the tenant_id claim; Postgres is the datasource." width="90%">
</p>

1. The SPA redirects the user to Keycloak's **realm `forest`** (code flow + PKCE S256).
2. Keycloak issues ID and access tokens; the browser keeps them in localStorage and renews silently.
3. The SPA calls `GET /api/me` on the backend with `Authorization: Bearer <access_token>`.
4. The backend validates the JWT against Keycloak's issuer, then a tenant filter pulls `tenant_id` off the token into a `ThreadLocal` for the request.
5. The endpoint echoes back your username, email, roles, and tenant — proof the whole loop works.
6. Postgres (via JPA + Flyway) is wired as the datasource whenever you add real tables.

## Run it

Prerequisites: Docker, Node ≥ 22.19, JDK 21.

```bash
# 1. environment (docker compose reads it automatically)
cp .env.example .env

# 2. infrastructure — Postgres + Keycloak (imports the "forest" realm on first boot)
docker compose up -d

# 3. backend — http://localhost:8080
cd backend
./mvnw spring-boot:run

# 4. frontend — http://localhost:5173
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and sign in with a demo user.

### Demo users

All three land in realm `forest` with password `changeme` (temporary — change before shipping anything real).

| User | Password | Role | `tenant_id` |
| --- | --- | --- | --- |
| `alice` | `changeme` | ADMIN | 1 |
| `bob` | `changeme` | MEMBER | 1 |
| `carol` | `changeme` | MEMBER | 2 |

Keycloak admin console: http://localhost:8081 (`admin` / `admin`).

### The endpoint

```
GET /api/me        (Bearer token required)
```

```json
{
  "username": "alice",
  "tenant_id": "1",
  "email": "alice@example.test",
  "roles": ["ADMIN"]
}
```

Health is open: `GET /actuator/health` (plus Prometheus metrics under `/actuator/metrics`).

## Convention over config

- Frontend build doubles as typecheck: `npm run lint && npm run build` (from `frontend/`).
- Backend honors `SERVER_PORT`, `KEYCLOAK_PORT`, `POSTGRES_*` env vars; a `dev` profile exists (`./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`).
- The `sampler/` directory generates Postgres test data from a YAML spec — handy when you need realistic volume in a scratch DB.

## Layout & status

Wired and working: OIDC sign-in/out, silent renewal, JWT resource server, `tenant_id` propagation, CORS for the dev origin, Postgres + Flyway + JPA plumbing, health/metrics, sample Testcontainers suite on the backend.

Deliberately left as an exercise: frontend tests (no runner configured yet), real JPA entities/migrations, and anything domain-specific.