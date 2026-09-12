/**
 * Module augmentation for `oidc-client-ts` — adds Keycloak-specific claims
 * to the {@link UserProfile} (aka `IdTokenClaims`) type.
 *
 * These claims are present when the Keycloak realm is configured with
 * the `oidc-usermodel-realm-role-mapper` set to "Add to ID token" and
 * the `roles` scope is requested (DEC-7 / OQ-5 Approach A).
 *
 * @module auth/keycloak-claims
 */

declare module 'oidc-client-ts' {
  /**
   * Shape of the Keycloak `realm_access` claim.
   *
   * Contains the realm-level roles assigned to the user, e.g.
   * `['OFFLINE_ALLOWED', 'uma_authorization']`.
   */
  interface RealmAccess {
    roles: string[];
  }

  /**
   * Shape of the Keycloak `resource_access` claim.
   *
   * Maps client IDs to the roles the user has for that client.
   * Example: `{ "account": { "roles": ["manage-account"] } }`.
   */
  interface ResourceAccessClient {
    roles: string[];
  }

  interface IdTokenClaims {
    /** Keycloak realm-level roles (present when `roles` scope is requested). */
    realm_access?: RealmAccess;
    /** Keycloak client-level roles, keyed by `client_id`. */
    resource_access?: Record<string, ResourceAccessClient>;
  }
}

/**
 * Re-exported for convenience so other modules can import the type
 * without reaching into the module augmentation site.
 */
export type { RealmAccess, ResourceAccessClient } from 'oidc-client-ts';
