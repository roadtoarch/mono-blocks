/**
 * MonoBlocks — Koa-style middleware compose
 *
 * Composes an array of middlewares plus a terminal transport into a single
 * `Transport` function. Each middleware receives `(ctx, next)` where `next()`
 * invokes the next middleware in the chain (or the transport at the end).
 *
 * Guards against calling `next()` multiple times within the same middleware.
 */

import type { Middleware, Transport, RequestContext, ResponseContext } from './types';

/**
 * Compose middlewares and a transport into a single Transport function.
 *
 * Execution order:
 *   middleware[0] → middleware[1] → … → middleware[N-1] → transport
 *
 * Each middleware can:
 * - Inspect / modify `ctx` before calling `next()`
 * - Inspect / modify the `ResponseContext` returned by `next()`
 * - Short-circuit by returning a `ResponseContext` without calling `next()`
 *
 * @throws {Error} If any middleware calls `next()` more than once.
 */
export const compose = (middlewares: Middleware[], transport: Transport): Transport => {
  return async (ctx: RequestContext): Promise<ResponseContext> => {
    let index = -1;
    const dispatch = async (i: number): Promise<ResponseContext> => {
      if (i <= index) {
        throw new Error('next() called multiple times');
      }
      index = i;
      if (i >= middlewares.length) {
        return transport(ctx);
      }
      const middleware = middlewares[i];
      return middleware(ctx, () => dispatch(i + 1));
    };
    return dispatch(0);
  };
};
