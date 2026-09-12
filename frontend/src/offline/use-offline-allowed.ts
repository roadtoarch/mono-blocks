/**
 * Hook that checks whether the current user has the `OFFLINE_ALLOWED`
 * realm role from Keycloak (DEC-7).
 *
 * Returns `false` while authentication is in progress, if the user is
 * not signed in, or if the `realm_access.roles` claim is absent from
 * the ID token.
 *
 * UI components gate offline features (pinning, outbox, filtered nav)
 * behind this hook so that they are only visible to authorised users.
 *
 * @module offline/use-offline-allowed
 */

import '@/auth/keycloak-claims';

import { useAuth } from 'react-oidc-context';

/** Keycloak realm role that grants offline feature access. */
const OFFLINE_ALLOWED_ROLE = 'OFFLINE_ALLOWED';

/**
 * Returns `true` if the authenticated user has the `OFFLINE_ALLOWED`
 * realm role in their OIDC ID token.
 */
export function useOfflineAllowed(): boolean {
  const auth = useAuth();

  if (!auth.isAuthenticated || !auth.user) {
    return false;
  }

  const realmAccess = auth.user.profile.realm_access;

  if (!realmAccess?.roles) {
    return false;
  }

  return realmAccess.roles.includes(OFFLINE_ALLOWED_ROLE);
}
