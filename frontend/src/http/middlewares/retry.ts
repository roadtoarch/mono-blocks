/**
 * MonoBlocks — Retry middleware
 *
 * Retries requests on server errors (5xx) and `NetworkError`.
 * Does **not** retry 4xx client errors or `AbortError`.
 *
 * Configuration via `ctx.meta`:
 * - `maxRetries`   — maximum retry attempts (default: 3)
 * - `retryDelayMs` — base delay in ms (default: 1000)
 *
 * Uses exponential backoff with full jitter:
 *   sleep = random(0, baseDelay × 2^attempt)
 *
 * The final `res.meta.retryCount` reflects how many retries occurred.
 */

import type { Middleware } from '../types';
import { HttpError, NetworkError } from '../types';

function isRetryableError(error: unknown): boolean {
  if (error instanceof HttpError && error.status >= 500) {
    return true;
  }
  if (error instanceof NetworkError) {
    return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a retry middleware with sensible defaults.
 */
export function createRetryMiddleware(): Middleware {
  return async (ctx, next) => {
    const maxRetries: number = (ctx.meta.maxRetries as number | undefined) ?? 3;
    const baseDelay: number = (ctx.meta.retryDelayMs as number | undefined) ?? 1000;

    let lastError: unknown;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const res = await next();
        res.meta.retryCount = attempt;
        return res;
      } catch (error) {
        lastError = error;

        if (attempt >= maxRetries || !isRetryableError(error)) {
          throw error;
        }

        const jitter = Math.random() * baseDelay * Math.pow(2, attempt);
        await sleep(jitter);
        attempt++;
      }
    }

    // Unreachable, but TypeScript needs it for control-flow analysis.
    throw lastError;
  };
}
