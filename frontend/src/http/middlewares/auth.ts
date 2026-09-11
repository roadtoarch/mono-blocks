/**
 * Auth middleware — injects the `Authorization: Bearer` header.
 *
 * Reads the current access token from an externally-provided
 * `tokenProvider` callback (typically backed by the OIDC UserManager
 * singleton) and merges it into `ctx.config.headers`.
 *
 * If the provider returns `null` or an empty string, the header is
 * **not** set — the request proceeds without authentication, allowing
 * public endpoints to work without a token.
 *
 * @module http/middlewares/auth
 */

import type { Middleware } from '../types';

/**
 * Function that resolves the current access token.
 *
 * Returns `null` when no authenticated session exists.
 * The auth middleware uses this instead of importing oidc-client-ts
 * directly, keeping the http layer framework-agnostic.
 */
export type TokenProvider = () => Promise<string | null>;

/**
 * Creates an auth middleware that injects a Bearer token header.
 *
 * @param tokenProvider - Callback that resolves the current access token.
 * @returns A {@link Middleware} that sets `Authorization: Bearer <token>`.
 *
 * @example
 * ```ts
 * const auth = createAuthMiddleware(async () => {
 *   const user = await userManager.getUser();
 *   return user?.access_token ?? null;
 * });
 * ```
 */
export const createAuthMiddleware = (tokenProvider: TokenProvider): Middleware => {
  const auth: Middleware = async (ctx, next) => {
    const token = await tokenProvider();

    if (token) {
      ctx.config.headers = {
        ...ctx.config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    return next();
  };

  return auth;
};
