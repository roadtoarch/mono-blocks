import { UserManager } from 'oidc-client-ts';
import { WebStorageStateStore } from 'oidc-client-ts';

import { env } from '../env';

import type { TenantConfig } from '../tenant/tenant.types';
import type { AuthProviderProps } from 'react-oidc-context';

/**
 * Factory that creates a `UserManager` and the corresponding
 * {@link AuthProviderProps} for `react-oidc-context`.
 *
 * All tenants share the same Keycloak realm (`forest`) but each uses its
 * own `client_id` from the tenant manifest. The `redirect_uri` is derived
 * from `window.location.origin` so it works on any subdomain.
 *
 * The returned `UserManager` is the single source of truth for token
 * access — both the `AuthProvider` and the API layer's `tokenProvider`
 * reference the same instance.
 */
export const createOidcConfig = (
  tenant: TenantConfig,
): { authProviderProps: AuthProviderProps; userManager: UserManager } => {
  const origin = globalThis.location.origin;
  const keycloakBase = env.VITE_KEYCLOAK_URL.replace(/\/$/, '');
  const authority = `${keycloakBase}/realms/forest`;

  const userManagerSettings = {
    authority,
    client_id: tenant.keycloakClientId,
    redirect_uri: origin,
    post_logout_redirect_uri: origin,
    scope: 'openid profile email',
    loadUserInfo: true,
    automaticSilentRenew: true,
    userStore: new WebStorageStateStore({ store: globalThis.localStorage }),
  };

  const userManager = new UserManager(userManagerSettings);

  const authProviderProps: AuthProviderProps = {
    userManager,
    onSigninCallback: () => {
      // Strip the OIDC `code`/`state` query params left by the authorization
      // redirect so they do not linger in the address bar.
      globalThis.history.replaceState({}, document.title, globalThis.location.pathname);
    },
  };

  return { authProviderProps, userManager };
};
