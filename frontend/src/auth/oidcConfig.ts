import { WebStorageStateStore } from 'oidc-client-ts';

import type { AuthProviderProps } from 'react-oidc-context';

const redirectUri = 'http://localhost:5173';

/**
 * OIDC configuration for the `react-oidc-context` {@link AuthProvider}.
 *
 * Points at the Keycloak `forest` realm and relies on Keycloak's hosted login
 * page (no custom form). The client is public with PKCE S256; the token
 * session is persisted in `localStorage` so it survives page reloads.
 */
export const oidcConfig: AuthProviderProps = {
  authority: 'http://localhost:8081/realms/forest',
  client_id: 'frontend-app',
  redirect_uri: redirectUri,
  post_logout_redirect_uri: redirectUri,
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
