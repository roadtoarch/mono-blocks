import { WebStorageStateStore } from 'oidc-client-ts';

import { env } from '../env';

import type { TenantConfig } from '../tenant/tenant.types';
import type { AuthProviderProps } from 'react-oidc-context';

/**
 * Factory that builds a `react-oidc-context` {@link AuthProviderProps}
 * configuration scoped to the given tenant.
 *
 * All tenants share the same Keycloak realm (`forest`) but each uses its
 * own `client_id` from the tenant manifest. The `redirect_uri` is derived
 * from `window.location.origin` so it works on any subdomain.
 */
export function createOidcConfig(tenant: TenantConfig): AuthProviderProps {
  const origin = globalThis.location.origin;
  const keycloakBase = env.VITE_KEYCLOAK_URL.replace(/\/$/, '');
  return {
    authority: `${keycloakBase}/realms/forest`,
    client_id: tenant.keycloakClientId,
    redirect_uri: origin,
    post_logout_redirect_uri: origin,
    scope: 'openid profile email',
    loadUserInfo: true,
    automaticSilentRenew: true,
    userStore: new WebStorageStateStore({ store: globalThis.localStorage }),
    onSigninCallback: () => {
      // Strip the OIDC `code`/`state` query params left by the authorization
      // redirect so they do not linger in the address bar.
      globalThis.history.replaceState({}, document.title, globalThis.location.pathname);
    },
  };
}
