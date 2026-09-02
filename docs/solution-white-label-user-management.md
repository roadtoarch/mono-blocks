# Solution: White-Labeling & Per-Tenant User Management

**Date:** 2026-09-02
**Status:** Approved
**Scope:** Extend per-tenant identity with deep white-labeling (fonts, layouts, feature flags, content) and tenant-admin self-service user management via Keycloak Admin REST API.
**Amends:** [solution-per-tenant-branding.md](./solution-per-tenant-branding.md) — promotes two items from "Out of Scope" into this phase.

---

## 1. Problem and Outcome

### Problem

The per-tenant branding phase (Phase 1-5, committed as `7e7f8d7`) provides color theming, logos, and per-tenant Keycloak clients. This is insufficient for two reasons:

1. **White-labeling is shallow** — tenants cannot customize fonts, navigation layout, feature visibility, or content copy. Every tenant looks structurally identical beyond colors and logo.
2. **User management is platform-only** — all user CRUD happens in the Keycloak admin console. Tenant admins have no self-service way to invite, deactivate, or re-role users within their own tenant.

### Desired Outcome

Each tenant feels like a distinct product:

- **Visual identity** extends to typography, navigation structure, feature set, and copy.
- **Tenant admins** manage their own users through an in-app interface, with tenant isolation enforced at the API layer.
- **Keycloak remains the source of truth** for user data; the backend wraps its Admin REST API.

### Non-Goals (what "wrong" looks like)

| Non-goal | Sign of gaming |
|----------|---------------|
| Platform-wide admin API | A `/api/admin/users` endpoint accessible to non-admin roles |
| Self-hosted font files in the build | Binary font assets committed to `/public`; fonts should come from a CDN or curated list |
| Per-tenant database isolation | Separate schemas or databases per tenant |
| Token revocation on deactivation | Immediate JWT invalidation (Keycloak doesn't support this by default; deactivation prevents re-auth) |
| Multi-tenant user sharing | A single user belonging to multiple tenants (current model is single-valued `tenant_id`) |

---

## 2. Scope

### In Scope

| ID | Capability | Slice |
|----|-----------|-------|
| A1 | Custom fonts per tenant (from curated list) | Slice 2 |
| A2 | Layout variations (top-nav vs side-nav) | Slice 5 |
| A3 | Feature flags per tenant | Slice 4 |
| A4 | Custom content/copy per tenant | Slice 3 |
| B1 | Tenant admin: list users in their tenant | Slice 7 |
| B2 | Tenant admin: invite users to their tenant | Slice 8 |
| B3 | Tenant admin: deactivate/activate users | Slice 9 |
| B4 | Tenant admin: change user roles (ADMIN/MEMBER) | Slice 10 |
| B5 | Backend wraps Keycloak Admin REST API | Slice 6 |
| B6 | Tenant isolation enforced on every user operation | Slice 6 |
| -- | Application routing foundation (TanStack Router) | Slice 1 |

### Out of Scope (this phase)

- Platform admin dashboard (separate epic)
- SMTP/invite email flow (Keycloak execute-actions email; deferred until SMTP is configured)
- Token introspection / revocation on deactivation
- Multi-valued tenant membership
- Per-tenant data isolation (already handled by JWT `tenant_id` + query filters)
- Tenant self-service theme editing UI

---

## 3. Personas and Journeys

### Persona: Tenant Admin (Alice)

Alice is an ADMIN in tenant 1 (Acme Corp). She manages her team's access to the platform.

**Primary journey — Invite a new team member:**

```
Given Alice is logged in at acme.localhost:5173
When she navigates to "Users" in the side-nav
  And clicks "Invite User"
  And fills in: email=bob2@example.test, firstName=Bob, lastName=Brown, role=MEMBER
  And submits the form
Then the backend creates a Keycloak user with:
  - tenant_id attribute = "1"
  - realm role = MEMBER
  - required action = UPDATE_PASSWORD
  And the user appears in the list
```

**Alternate journey — Deactivate a departing employee:**

```
Given Alice sees Bob in the user list
When she clicks "Deactivate" on Bob's row
  And confirms the modal
Then Bob's Keycloak account is set to enabled=false
  And Bob cannot log in on next auth attempt
```

**Failure path — Cross-tenant access denied:**

```
Given Alice (tenant_id=1) crafts an API call to PATCH /api/users/{carol-uuid}/roles
When carol's tenant_id attribute = "2"
Then the backend returns 403 Forbidden
```

### Persona: Platform Operator

The operator manages the Keycloak realm and deployment. They do NOT manage individual tenant users.

**Journey — Add a new tenant:**

```
Given the operator wants to onboard "WestCoast Logging"
When they add an entry to tenants.json:
  { "subdomain": "westcoast", "tenantId": "3", "displayName": "WestCoast Logging",
    "keycloakClientId": "westcoast-app",
    "theme": { ... }, "typography": { "fontFamily": "Roboto" },
    "layout": "side-nav", "features": { "userManagement": true },
    "content": { "welcomeHeading": "Welcome to WestCoast Logging" } }
  And create a Keycloak client "westcoast-app" with login_theme=westcoast
  And add a login theme under keycloak/themes/westcoast/
Then the new tenant is accessible at westcoast.localhost:5173 with full branding
```

### Persona: Regular Member (Bob)

Bob is a MEMBER in tenant 1. He has no admin capabilities.

**Journey — No access to user management:**

```
Given Bob is logged in at acme.localhost:5173
When he looks at the navigation
Then there is no "Users" link (feature flag userManagement is gated by ADMIN role)
  And direct API access to /api/users returns 403
```

---

## 4. Requirements

### Functional Requirements

| ID | Requirement |
|----|------------|
| FR-001 | The tenant manifest SHALL support a `typography.fontFamily` field per tenant, validated against a curated list of available font families. |
| FR-002 | The application SHALL apply the tenant's font family to `:root` at boot time, before first render. |
| FR-003 | The tenant manifest SHALL support a `layout` field with values `'top-nav'` (default) or `'side-nav'`. |
| FR-004 | When `layout` is `'side-nav'`, the application SHALL render a Carbon `SideNav` with route links instead of the top-nav `Header`-only layout. |
| FR-005 | The tenant manifest SHALL support a `features` map (`Record<string, boolean>`) per tenant. |
| FR-006 | A `useFeature(name)` hook SHALL return the boolean value of the named feature flag for the current tenant. |
| FR-007 | The tenant manifest SHALL support a `content` object with `welcomeHeading`, `welcomeBody`, and `footerText` fields per tenant. |
| FR-008 | The landing page and app shell SHALL render tenant-specific content from the manifest. |
| FR-009 | The backend SHALL expose `GET /api/users` returning a paginated list of users filtered to the caller's `tenant_id`. |
| FR-010 | Only users with the ADMIN role SHALL be authorized to call user management endpoints. |
| FR-011 | The backend SHALL expose `POST /api/users/invite` creating a Keycloak user with the caller's `tenant_id` attribute and a specified role. |
| FR-012 | The backend SHALL expose `PATCH /api/users/{userId}/status` enabling or disabling a Keycloak user. |
| FR-013 | The backend SHALL expose `PATCH /api/users/{userId}/roles` replacing a user's realm role mappings. |
| FR-014 | Every user management endpoint SHALL verify that the target user's `tenant_id` attribute matches the caller's JWT `tenant_id` claim. |
| FR-015 | The backend SHALL authenticate to Keycloak Admin API using a service-account client with `view-users`, `manage-users`, and `query-users` realm-management roles. |

### Non-Functional Requirements

| ID | Requirement |
|----|------------|
| NFR-001 | All existing tenant branding behavior (colors, logos, login themes, OIDC config) SHALL continue to work unchanged. |
| NFR-002 | The curated font list SHALL contain no more than 10 font families to limit manifest size and loading time. |
| NFR-003 | Feature flag evaluation SHALL be client-side only (no backend enforcement) in this phase. |
| NFR-004 | User management endpoints SHALL return 403 Forbidden for cross-tenant access attempts (not 404, to distinguish from "not found"). |
| NFR-005 | The invite endpoint SHALL NOT send emails in this phase (SMTP not configured); the user is created with `UPDATE_PASSWORD` required action. |
| NFR-006 | The user list endpoint SHALL support pagination via `first` and `max` query parameters (default: first=0, max=20). |

---

## 5. Acceptance Criteria and Gates

| ID | Criterion | Verification |
|----|-----------|-------------|
| AC-001 | Given a tenant with `typography.fontFamily: "Roboto"`, the `body` element has `font-family: "Roboto", sans-serif` | DevTools inspection of computed style on `:root` |
| AC-002 | Given a tenant with `layout: "side-nav"`, the Carbon `SideNav` component is visible with navigation links | Visual inspection at `acme.localhost:5173` |
| AC-003 | Given a tenant with `features.userManagement: false`, the "Users" nav item is not rendered and `useFeature('userManagement')` returns `false` | Conditional rendering check + hook return value |
| AC-004 | Given a tenant with custom `content.welcomeHeading`, the landing page displays that heading text | Visual inspection of landing page per tenant |
| AC-005 | Given an ADMIN user calls `GET /api/users`, the response contains only users with matching `tenant_id` | API test: alice (t1) sees alice+bob; carol (t2) sees only carol |
| AC-006 | Given a MEMBER user calls `GET /api/users`, the response is 403 Forbidden | API test: bob gets 403 |
| AC-007 | Given an ADMIN calls `POST /api/users/invite` with email, name, and role, a Keycloak user is created with `tenant_id` attribute and `UPDATE_PASSWORD` required action | Keycloak admin console inspection |
| AC-008 | Given an ADMIN calls `PATCH /api/users/{userId}/status` with `enabled: false`, the target user's Keycloak account has `enabled: false` | Keycloak admin console inspection |
| AC-009 | Given an ADMIN calls `PATCH /api/users/{userId}/roles` with a new role, the target user's realm roles in Keycloak match the updated set | Keycloak admin console inspection |
| AC-010 | Given alice (t1) targets carol's UUID in any user management endpoint, the response is 403 Forbidden | API test with cross-tenant UUID |
| AC-011 | `npm run lint && npm run build` passes after every slice | CI pipeline |
| AC-012 | `mvn test` passes after every slice; existing `SecurityIntegrationTest` tests remain green | Maven build |
| AC-013 | The Keycloak realm export imports cleanly with the new service-account client | `docker-compose down -v && docker-compose up` — Keycloak starts |

### Entry Gate

- All requirements are testable (FR-* mapped to AC-*).
- Scope is agreed (user confirmed all 4 white-label options + tenant admin self-service).
- Keycloak Admin REST API is documented and accessible.

### Exit Gate

- All AC-* criteria pass.
- No RISK-* items at "high" severity remain unmitigated.
- Existing branding phase tests remain green.

---

## 6. Solution Shape

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend (React 19.2 + Carbon v11)                          │
│                                                               │
│  tenants.json (extended)                                      │
│  ├── theme (existing: colors, logo)                           │
│  ├── typography: { fontFamily: "Roboto" }                     │
│  ├── layout: "top-nav" | "side-nav"                           │
│  ├── features: { userManagement: true, ... }                  │
│  └── content: { welcomeHeading, welcomeBody, footerText }     │
│                                                               │
│  TanStack Router → route tree                                 │
│  ├── / → LandingPage                                          │
│  ├── /users → UserListPage (gated by ADMIN + feature flag)    │
│  └── /users/invite → InviteUserForm                           │
│                                                               │
│  useFeature(name) → reads tenant.features                     │
│  LayoutRouter → TopNavLayout | SideNavLayout                  │
└──────────────────────┬───────────────────────────────────────┘
                       │ Bearer JWT
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  Backend (Spring Boot 4.1.1)                                  │
│                                                               │
│  UserController (new)                                         │
│  ├── GET  /api/users          → list (tenant-scoped)          │
│  ├── POST /api/users/invite   → create (tenant-scoped)        │
│  ├── PATCH /api/users/{id}/status → enable/disable            │
│  └── PATCH /api/users/{id}/roles   → role mapping update      │
│                                                               │
│  UserService → KeycloakAdminClient → Keycloak Admin REST API  │
│  TenantIsolationCheck → verify target.tenant_id == jwt.tenant_id │
│                                                               │
│  SecurityConfig → ADMIN role required for /api/users/**       │
└──────────────────────┬───────────────────────────────────────┘
                       │ service-account token
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  Keycloak                                                     │
│                                                               │
│  Service-account client: "backend-admin"                      │
│  Realm-management roles: view-users, manage-users, query-users│
│                                                               │
│  Admin REST API endpoints:                                    │
│  GET    /admin/realms/forest/users?attribute:tenant_id={id}   │
│  POST   /admin/realms/forest/users                            │
│  PATCH  /admin/realms/forest/users/{id}                       │
│  PUT    /admin/realms/forest/users/{id}/role-mappings/realm   │
└──────────────────────────────────────────────────────────────┘
```

### Key Decisions

| DEC-ID | Decision | Alternatives | Rationale | Consequences | Revisit trigger |
|--------|----------|-------------|-----------|-------------|----------------|
| DEC-001 | TanStack Router for application routing | React Router, component-based routing (status quo) | Already a project dependency; type-safe route definitions; layout routes support side-nav pattern | New dependency in route tree; ProtectedRoute refactored | If route count stays <3, component-based routing may suffice |
| DEC-002 | Keycloak Admin REST API via RestClient (Spring 6+) | Keycloak Admin Client library, WebClient | No extra dependency; Spring 6+ RestClient is synchronous and simpler than WebClient for this use case | Manual DTO mapping for Keycloak's user representation | If Keycloak API changes significantly |
| DEC-003 | Service-account client for backend auth to Keycloak | Bootstrap admin credentials, direct DB access | Audit trail; scoped permissions; no shared credentials in docker-compose | New client in realm export; needs `backend-admin` client secret in env | If single-tenant mode is needed |
| DEC-004 | Client-side feature flags only (no backend enforcement) | Full-stack feature flag service | Low complexity; flags control UI visibility, not security | Feature-flagged API endpoints still need explicit role checks | If flags need to gate API behavior |
| DEC-005 | `tenant_id` remains single-valued user attribute | Multi-valued attribute, separate group-per-tenant | Current model works; multi-tenancy adds significant complexity | A user cannot belong to two tenants | If business requires shared users |
| DEC-006 | Invite creates user with UPDATE_PASSWORD (no email) | Send invite email via Keycloak execute-actions | SMTP not configured; out-of-band communication is acceptable for now | Admin must communicate credentials separately | When SMTP is configured |

---

## 7. Risks and Dependencies

### Risk Register

| ID | Risk | Impact | Likelihood | Mitigation | Owner | Residual risk |
|----|------|--------|-----------|-----------|-------|--------------|
| RISK-001 | Keycloak Admin API changes between versions | Medium | Low | Pin Keycloak version; wrap calls in a single client class | Backend dev | Low |
| RISK-002 | Service-account secret exposure in docker-compose | High | Medium | Use Docker secrets or environment variable injection; never commit secret | Platform operator | Medium |
| RISK-003 | Cross-tenant data leak if isolation check is bypassed | High | Low | Tenant isolation in a single service-layer method; integration test for every endpoint | Backend dev | Low |
| RISK-004 | Deactivated user retains valid JWT until expiry | Medium | High | Document limitation; JWT TTL is 5 minutes (configured); deactivation prevents re-auth | Product owner | Medium |
| RISK-005 | Layout regression in existing top-nav tenants | Medium | Low | Side-nav is opt-in via manifest; top-nav remains default; visual regression test | Frontend dev | Low |
| RISK-006 | Font loading delay on first visit | Low | Medium | Use system font fallbacks in curated list; preload critical fonts | Frontend dev | Low |

### Dependencies

| Dependency | Type | Blocks |
|-----------|------|--------|
| TanStack Router installed | Upstream work | Slices 1, 5, 7 |
| Keycloak service-account client created in realm | Upstream work | Slice 6 |
| Curated font list defined | Decision needed | Slice 2 |

### Critical Path

```
Slice 6 (Keycloak Admin) ──→ Slice 7 (List Users) ──→ Slice 8 (Invite)
                                                   ──→ Slice 9 (Deactivate)
                                                   ──→ Slice 10 (Roles)

Slice 1 (Router) ──→ Slice 5 (Layout) ──→ Slice 7 (List Users page)

Slices 2, 3, 4 are independent and can proceed in parallel
```

### Parallel Tracks

- **Track A (White-labeling):** Slices 2, 3, 4 → Slice 5 → Slice 1
- **Track B (User management):** Slice 6 → Slice 7 → Slices 8, 9, 10

---

## 8. Decisions and Open Questions

### Open Questions (Resolved)

| ID | Question | Decision | Rationale |
|----|----------|----------|-----------|
| OQ-001 | What curated font list should be offered? | **Google Fonts subset** — Inter, Roboto, Open Sans, Lato, Source Sans Pro, Poppins loaded via `<link>` | CDN-hosted, no build bloat, wide coverage |
| OQ-002 | Should the user list show "unassigned" users (no tenant_id)? | **Exclude them** — tenant-scoped queries only return users with matching tenant_id | Clean isolation; unassigned users are a platform concern, not tenant admin |
| OQ-003 | Maximum expected users per tenant? | **Dozens (<50)** — simple list UI, no pagination controls initially | Backend still supports `first`/`max` params, but frontend renders all results |
| OQ-004 | Feature flag typing? | **Typed constants** — define known flag names in a constants file | Autocomplete + compile-time safety; flags are an implementation concern, not user-extensible |
| OQ-005 | Side-nav collapsible? | **Collapsible** — users can toggle between expanded and icon-only modes | Better UX on smaller screens; Carbon `SideNav` supports `isRail` prop |

### Amendment Log

| Amendment | Status | Rationale | Affected evidence | Decision owner |
|-----------|--------|-----------|-------------------|---------------|
| (none yet) | | | | |

---

## 9. Traceability and Next Steps

### Requirements Traceability

| Requirement | Acceptance | Source | Validation | Area |
|------------|-----------|--------|-----------|------|
| FR-001 (font family in manifest) | AC-001 | User decision | DevTools | Frontend |
| FR-002 (font applied at boot) | AC-001 | User decision | DevTools | Frontend |
| FR-003 (layout field) | AC-002 | User decision | Visual | Frontend |
| FR-004 (side-nav rendering) | AC-002 | User decision | Visual | Frontend |
| FR-005 (features map) | AC-003 | User decision | Hook return | Frontend |
| FR-006 (useFeature hook) | AC-003 | User decision | Hook return | Frontend |
| FR-007 (content object) | AC-004 | User decision | Visual | Frontend |
| FR-008 (content rendering) | AC-004 | User decision | Visual | Frontend |
| FR-009 (GET /api/users) | AC-005, AC-011 | User decision | API test + lint/build | Backend + Frontend |
| FR-010 (ADMIN role required) | AC-006 | User decision | API test | Backend |
| FR-011 (POST invite) | AC-007 | User decision | KC console | Backend |
| FR-012 (PATCH status) | AC-008 | User decision | KC console | Backend |
| FR-013 (PATCH roles) | AC-009 | User decision | KC console | Backend |
| FR-014 (tenant isolation) | AC-010 | Security requirement | API test | Backend |
| FR-015 (service-account) | AC-013 | DEC-003 | docker-compose | Platform |

### Work Slices with Effort Estimates

| Slice | Type | Low (hrs) | Expected (hrs) | High (hrs) | Points | Confidence | Decomposition required |
|-------|------|--------:|---------------:|----------:|-------:|-----------:|:----------------------|
| 1. Routing Foundation | greenfield | 4 | 8 | 12 | 3 | medium | false |
| 2. Custom Fonts | greenfield | 2 | 4 | 6 | 2 | high | false |
| 3. Custom Content | greenfield | 2 | 4 | 6 | 2 | high | false |
| 4. Feature Flags | greenfield | 2 | 4 | 6 | 2 | high | false |
| 5. Layout Variations | greenfield | 8 | 16 | 24 | 5 | medium | false |
| 6. KC Admin Foundation | greenfield | 12 | 20 | 32 | 8 | medium | true → 6a (client setup + config), 6b (WebClient + DTOs), 6c (tenant isolation) |
| 7. List Users | greenfield | 8 | 12 | 16 | 5 | medium | false |
| 8. Invite Users | greenfield | 4 | 8 | 12 | 3 | medium | false |
| 9. Deactivate Users | greenfield | 2 | 4 | 6 | 2 | high | false |
| 10. Change Roles | greenfield | 4 | 6 | 8 | 3 | medium | false |

**Total:** ~50 expected hours, ~88 high-end hours across 10 slices.
**Epic A (white-labeling, slices 1-5):** ~19 expected hours.
**Epic B (user management, slices 6-10):** ~31 expected hours.
**Combined sprint allocation:** ~8 expected hours/week over 6-7 weeks for one developer, or ~3 weeks for two developers working in parallel on Tracks A and B.

### Next Steps

1. **Confirm open questions** — OQ-001 (font list), OQ-003 (user scale), OQ-005 (side-nav behavior) materially affect implementation.
2. **Run `test-planning`** before issue creation (non-trivial work with security boundaries).
3. **Convert to GitHub issues** via `plan-to-issues` skill once the brief is approved.
4. **Implement in slice order** — Slices 2, 3, 4, 6 can begin immediately in parallel. Slice 1 is a prerequisite for 5 and 7.

### Effort Summary

| Metric | Value |
|--------|-------|
| Work type | Greenfield (all slices) |
| Total expected effort | ~50 developer-hours |
| Total high-end effort | ~88 developer-hours |
| Sprint allocation (1 dev) | ~4 slices/sprint (116.7 hrs/sprint) |
| Parallel track speedup | 2 developers → ~3-4 weeks |
| Confidence | Medium (Keycloak Admin API integration has unknowns) |
| Calibration gap | No prior Keycloak Admin REST API work in this project |
