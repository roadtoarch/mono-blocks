/**
 * MonoBlocks — Offline middleware (placeholder)
 *
 * Typed placeholder for future offline detection and request queuing.
 * Currently passes through to `next()` without modification.
 *
 * Future behaviour:
 * - Detect `navigator.onLine === false`
 * - Queue mutating requests to IndexedDB
 * - Replay queued requests when connectivity is restored
 */

import type { Middleware } from '../types';

/**
 * Create an offline middleware (currently a no-op passthrough).
 */
export function createOfflineMiddleware(): Middleware {
  return async (_ctx, next) => {
    // TODO: implement offline detection + request queuing
    return next();
  };
}
