/**
 * MonoBlocks — Auth middleware
 *
 * Injects an `Authorization: Bearer <token>` header into every request.
 * When the token provider returns `null` the header is omitted, allowing
 * public (unauthenticated) endpoints to work without a token.
 */

import type { Middleware } from '../types';

export type TokenProvider = () => Promise<string | null>;

/**
 * Create an auth middleware that injects a Bearer token from `tokenProvider`.
 *
 * The provider is called on **every** request so that expiring tokens
 * (e.g. OIDC access tokens) are always fresh.
 */
export const createAuthMiddleware = (tokenProvider: TokenProvider): Middleware => {
  return async (ctx, next) => {
    const token = await tokenProvider();
    if (token) {
      ctx.config.headers = {
        ...ctx.config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
    return next();
  };
};
