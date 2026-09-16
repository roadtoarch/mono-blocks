/**
 * MonoBlocks — Cache middleware (placeholder)
 *
 * Typed placeholder for future response caching.
 * Currently passes through to `next()` without modification.
 *
 * Future behaviour:
 * - Cache GET responses with configurable TTL
 * - Serve stale-while-revalidate
 * - Invalidate by cache key / tag
 */

import type { Middleware } from '../types';

/**
 * Create a cache middleware (currently a no-op passthrough).
 */
export function createCacheMiddleware(): Middleware {
  return async (_ctx, next) => {
    // TODO: implement response caching with TTL
    return next();
  };
}
