import { createOidcConfig } from './createOidcConfig';

import type { TenantConfig } from '../tenant/tenant.types';

/**
 * Fallback tenant config used when a component needs an OIDC config outside
 * the normal tenant-resolution flow (e.g. tests or standalone usage).
 */
const fallbackTenant: TenantConfig = {
  subdomain: 'acme',
  tenantId: '1',
  displayName: 'ACME Corp',
  keycloakClientId: 'frontend-app',
  theme: {
    primary: '#1192e6',
    primaryText: '#ffffff',
    headerBackground: '#1192e6',
    headerText: '#ffffff',
    logoUrl: '/tenants/acme/logo.svg',
    faviconUrl: '/tenants/acme/favicon.ico',
  },
};

/**
 * Default OIDC configuration — delegates to {@link createOidcConfig} with a
 * fallback tenant. Prefer the dynamic path in `main.tsx` which resolves the
 * real tenant from the manifest.
 *
 * @deprecated Use `createOidcConfig(tenant)` with the resolved tenant instead.
 */
export const oidcConfig = createOidcConfig(fallbackTenant);
