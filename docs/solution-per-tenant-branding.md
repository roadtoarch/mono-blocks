# Solution: Per-Tenant Branding & Authentication

**Date:** 2026-09-02
**Status:** Proposed
**Scope:** End-to-end per-tenant identity — Keycloak login pages, frontend routing, runtime theming

---

## Problem Statement

The SPAT platform serves multiple tenants (forestry companies) on a single deployment. Today, all tenants share:

- One Keycloak client (`frontend-app`) with a generic login page
- One frontend URL (`localhost:5173`) regardless of tenant
- One Carbon v11 theme (default BCGov styling)

Each tenant should feel like they have their own branded experience:
1. **Login page** — tenant logo, tenant color scheme, tenant name
2. **App shell** — tenant-specific primary color, logo in header
3. **URL** — `<tenant>.localhost:5173` (subdomain-per-tenant)

---

## Current State

### Keycloak (single client)

```json
{
  "clientId": "frontend-app",
  "name": "Forest Resource Assessment",
  "redirectUris": ["http://localhost:5173/*"],
  "webOrigins": ["http://localhost:5173"]
}
```

Users carry `tenant_id` as a custom attribute (alice=1, bob=1, carol=2, dave=none).

### Frontend (static OIDC config)

```ts
// frontend/src/auth/oidcConfig.ts
export const oidcConfig = {
  authority: `${KEYCLOAK_URL}/realms/forest`,
  client_id: "frontend-app",
  redirect_uri: "http://localhost:5173",
};
```

### App shell (hardcoded branding)

```tsx
// frontend/src/components/AppShell.tsx
<HeaderName prefix="BCGov">Forest</HeaderName>
```

### Theming (none)

Carbon v11 default theme loaded via `@use '@carbon/react'` in `styles.scss`. No runtime theme switching.

---

## Solution Overview

```
┌─────────────────────────────────────────────────────────┐
│  acme.localhost:5173         northpac.localhost:5173     │
│  ┌──────────────────────┐   ┌──────────────────────┐    │
│  │  Frontend SPA         │   │  Frontend SPA         │    │
│  │  tenant=acme          │   │  tenant=northpac      │    │
│  │  theme=acme.json      │   │  theme=northpac.json  │    │
│  │  client=frontend-acme │   │  client=frontend-npac │    │
│  └──────────┬───────────┘   └──────────┬───────────┘    │
│             │                          │                 │
│             ▼                          ▼                 │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Keycloak (2 clients: frontend-acme, frontend-npac) │    │
│  │  Each with its own login theme (logo + colors)      │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1 — Tenant Resolution Strategy

**Approach:** Subdomain-based tenant resolution at the frontend edge.

| Subdomain | tenant_id | tenant_slug | Keycloak client |
|-----------|-----------|-------------|-----------------|
| `acme.localhost:5173` | 1 | acme | `frontend-acme` |
| `northpac.localhost:5173` | 2 | northpac | `frontend-northpac` |

**Resolution flow:**

```
URL → window.location.hostname
    → extract subdomain ("acme")
    → fetch /tenants.json (static manifest)
    → resolve { tenant_id, client_id, theme }
    → configure OIDC dynamically
```

**Files to create:**

```
frontend/public/tenants.json          # static tenant manifest
frontend/src/tenant/resolveTenant.ts  # subdomain → tenant config
```

**`tenants.json` structure:**

```json
{
  "acme": {
    "tenant_id": 1,
    "display_name": "Acme Forestry",
    "keycloak_client_id": "frontend-acme",
    "theme": {
      "primary_color": "#1B6B93",
      "logo_url": "/tenants/acme/logo.svg"
    }
  },
  "northpac": {
    "tenant_id": 2,
    "display_name": "NorthPacific Timber",
    "keycloak_client_id": "frontend-northpac",
    "theme": {
      "primary_color": "#4A7C59",
      "logo_url": "/tenants/northpac/logo.svg"
    }
  }
}
```

**`resolveTenant.ts`:**

```ts
export function resolveTenant(): TenantConfig {
  const hostname = window.location.hostname;
  const subdomain = hostname.split(".")[0];
  // fetch tenants.json (cached), lookup by subdomain
  // return TenantConfig or null (→ show "unknown tenant" page)
}
```

**Vite config change:**

```ts
// vite.config.ts
server: {
  allowedHosts: [".localhost"],  // allow *.localhost
}
```

---

### Phase 2 — Keycloak Multi-Client Setup

**One client per tenant.** Each client has its own login theme.

**Keycloak realm changes (`realm-forest.json`):**

```json
{
  "clients": [
    {
      "clientId": "frontend-acme",
      "name": "Acme Forestry Portal",
      "redirectUris": ["http://acme.localhost:5173/*"],
      "webOrigins": ["http://acme.localhost:5173"],
      "attributes": {
        "login_theme": "acme"
      }
    },
    {
      "clientId": "frontend-northpac",
      "name": "NorthPacific Timber Portal",
      "redirectUris": ["http://northpac.localhost:5173/*"],
      "webOrigins": ["http://northpac.localhost:5173"],
      "attributes": {
        "login_theme": "northpac"
      }
    }
  ]
}
```

**Keycloak login themes:**

Keycloak supports custom login themes via FreeMarker templates. For each tenant, create a theme under `keycloak/themes/<tenant>/`:

```
keycloak/themes/acme/
├── theme.properties
├── login/
│   ├── theme.properties        # parent=base, import=common
│   ├── login.ftl               # override header/logo
│   └── resources/
│       ├── css/login.css       # tenant-specific colors
│       └── img/logo.svg        # tenant logo
└── common/
    └── resources/              # shared assets (optional)
```

**`theme.properties` for Acme:**

```properties
parent=base
import=common/keycloak
styles=css/login.css
kcLoginClass=acme-login
```

**`login.css` for Acme:**

```css
:root {
  --brand-primary: #1B6B93;
  --brand-secondary: #F4A261;
}

.login-pf body {
  background: linear-gradient(135deg, var(--brand-primary), #0D3B66);
}

#kc-header-wrapper {
  background: url('../img/logo.svg') center/contain no-repeat;
  height: 80px;
  padding: 0;
}
```

**Alternative — simpler approach:** Use Keycloak's `loginUpdateProfile` theme attribute to set per-client logo and colors without full FreeMarker overrides. Keycloak 26+ supports `kcLogoId` and custom CSS properties via client attributes. This avoids maintaining separate FTL files per tenant.

**Recommended:** Start with the full theme approach (3 files per tenant) since it gives maximum control. The theme structure is small and copy-pasteable.

---

### Phase 3 — Dynamic OIDC Configuration

**Change:** Move from static `oidcConfig.ts` to a factory function that takes the resolved tenant.

```ts
// frontend/src/auth/oidcConfig.ts → now a factory
export function createOidcConfig(tenant: TenantConfig): AuthConfig {
  return {
    authority: `${KEYCLOAK_URL}/realms/forest`,
    client_id: tenant.keycloak_client_id,
    redirect_uri: window.location.origin,
    post_logout_redirect_uri: window.location.origin,
  };
}
```

**`main.tsx` changes:**

```tsx
const tenant = resolveTenant();
const oidcConfig = createOidcConfig(tenant);

root.render(
  <AuthProvider {...oidcConfig}>
    <App tenant={tenant} />
  </AuthProvider>
);
```

---

### Phase 4 — Carbon v11 Runtime Theming

Carbon v11 uses CSS custom properties (`--cds-*`). Override them at runtime per tenant.

**Approach:** Generate tenant-specific CSS custom property overrides and inject them into `<html>`.

**`frontend/src/tenant/applyTheme.ts`:**

```ts
export function applyTheme(theme: TenantTheme): void {
  const root = document.documentElement;
  // Map tenant primary color → Carbon interactive tokens
  root.style.setProperty('--cds-interactive-01', theme.primary_color);
  root.style.setProperty('--cds-interactive-02', theme.primary_color);
  root.style.setProperty('--cds-focus', theme.primary_color);
  root.style.setProperty('--cds-link-01', theme.primary_color);
  // Derive hover/active shades (or use pre-computed palette)
}
```

**Tenant logo in AppShell:**

```tsx
// AppShell.tsx — replace hardcoded prefix
<HeaderName prefix="">
  <img src={tenant.theme.logo_url} alt={tenant.display_name} height={24} />
</HeaderName>
```

**Full tenant-specific Carbon theme (advanced):**

For deeper customization (e.g., different border-radius, font, spacing per tenant), use Carbon's `<Theme>` component with a custom theme object:

```tsx
<Theme theme={{ [tenant.theme.name]: true }}>
  <AppShell />
</Theme>
```

This requires defining tenant themes as Carbon theme tokens, which is more work. **Recommendation:** Start with CSS custom property overrides; graduate to `<Theme>` only if needed.

---

### Phase 5 — Backend Tenant Validation

**Add:** Backend validates that the JWT's `tenant_id` claim matches the client that issued it.

```java
// SecurityConfig.java — add client_id validation
// Each Keycloak client embeds tenant_id in the token (via protocol mapper)
// Backend validates: jwt.getClaim("tenant_id") matches the expected tenant for that client
```

**Keycloak protocol mapper:** Add a hardcoded `tenant_id` claim per client:

```json
{
  "protocolMappers": [
    {
      "name": "tenant-id",
      "protocol": "openid-connect",
      "protocolMapper": "oidc-hardcoded-claim-mapper",
      "config": {
        "claim.name": "tenant_id",
        "claim.value": "1",
        "id.token.claim": "true",
        "access.token.claim": "true"
      }
    }
  ]
}
```

This way, even if a user belongs to multiple tenants, the **client** determines which `tenant_id` is in the token.

---

## File Inventory

### New Files

| File | Purpose |
|------|---------|
| `frontend/public/tenants.json` | Tenant manifest (slug → config) |
| `frontend/src/tenant/resolveTenant.ts` | Subdomain → tenant resolution |
| `frontend/src/tenant/applyTheme.ts` | Runtime CSS custom property injection |
| `frontend/public/tenants/acme/logo.svg` | Acme logo asset |
| `frontend/public/tenants/northpac/logo.svg` | NorthPacific logo asset |
| `keycloak/themes/acme/theme.properties` | Acme login theme descriptor |
| `keycloak/themes/acme/login/theme.properties` | Acme login page config |
| `keycloak/themes/acme/login/login.ftl` | Acme login page template |
| `keycloak/themes/acme/login/resources/css/login.css` | Acme login colors |
| `keycloak/themes/acme/login/resources/img/logo.svg` | Acme Keycloak logo |
| _(repeat `keycloak/themes/` structure for `northpac`)_ | |

### Modified Files

| File | Change |
|------|--------|
| `frontend/src/auth/oidcConfig.ts` | Static config → `createOidcConfig(tenant)` factory |
| `frontend/src/main.tsx` | Resolve tenant before creating OIDC provider; pass tenant to `<App>` |
| `frontend/src/App.tsx` | Accept `tenant` prop; apply theme on mount |
| `frontend/src/components/AppShell.tsx` | Replace hardcoded "BCGov"/"Forest" with tenant display name + logo |
| `frontend/src/components/ProtectedRoute.tsx` | Accept `tenant` prop for context |
| `frontend/vite.config.ts` | Add `server.allowedHosts: [".localhost"]` |
| `keycloak/import/realm-forest.json` | Add per-tenant clients + protocol mappers + redirect URIs |
| `docker-compose.yml` | Mount `keycloak/themes/` into Keycloak container |

---

## Implementation Sequence

```
Phase 1: Tenant resolution (frontend)     ← no infra changes
    │
    ├── Phase 2: Keycloak multi-client    ← realm.json + themes
    │
    ├── Phase 3: Dynamic OIDC config      ← connects Phase 1 + 2
    │
    ├── Phase 4: Carbon runtime theming   ← CSS override approach
    │
    └── Phase 5: Backend validation       ← protocol mapper + claim check
```

**Phase 1** can be developed and tested independently (resolve tenant from URL, log it).
**Phase 2+3** unlock the per-tenant login experience.
**Phase 4** makes the post-login app feel tenant-specific.
**Phase 5** is a security hardening step.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Wildcard subdomain in dev (`*.localhost`) | Vite `allowedHosts` + `/etc/hosts` or `dnsmasq` for resolution |
| Keycloak theme maintenance per tenant | Shared `common/` theme resources; only logo+colors differ |
| Carbon token override breakage on upgrade | Pin Carbon version; test theme overrides in CI |
| Tenant resolution failure (unknown subdomain) | Show error page with instructions, don't fall back to a default tenant |
| Token `tenant_id` mismatch | Backend rejects with 403; log the mismatch for audit |

---

## Out of Scope (This Phase)

- **DNS / production routing** — `*.tenant.example.com` with nginx/ingress is a deployment concern
- **Multi-tenant data isolation** — already handled by `tenant_id` in JWT + query filters
- **Per-tenant user management** — Keycloak realms could be split later for true isolation
- **Tenant self-service theme editing** — admin UI for theme customization is a separate epic
- **White-labeling beyond colors/logo** — font changes, layout changes per tenant
