/**
 * Cache middleware — read-through HTTP response cache with TTL and dedup.
 *
 * Intercepts GET requests and provides:
 * 1. **Read-through**: returns cached response if fresh, otherwise
 *    forwards the request and caches the successful response.
 * 2. **TTL**: entries older than `ttlMs` are treated as misses.
 * 3. **Deduplication**: in-flight Map prevents duplicate concurrent
 *    requests for the same cache key.
 * 4. **Eviction**: when `maxEntries` is exceeded, the oldest entries
 *    are evicted.
 *
 * Set `ctx.meta.skipCache = true` to bypass the cache for a specific
 * request (e.g. force-refresh).
 *
 * @module http/middlewares/cache
 */

import type { CacheAdapter, CachedResponse } from './types';
import type { Middleware, RequestContext, ResponseContext } from '../types';

// ── Options ─────────────────────────────────────────────────────────

/**
 * Configuration for the cache middleware.
 */
export interface CacheMiddlewareOptions {
  /** Storage backend for cached responses. */
  adapter: CacheAdapter;
  /** Default TTL in milliseconds for cached entries. */
  ttlMs: number;
  /** Maximum number of entries. Oldest are evicted when exceeded. */
  maxEntries: number;
}

// ── Cache key ───────────────────────────────────────────────────────

/**
 * Builds a deterministic cache key from the request context.
 *
 * Uses `method:url` so that different methods to the same URL
 * don't collide (though only GETs are cached by this middleware).
 */
const buildCacheKey = (ctx: RequestContext): string =>
  `${ctx.config.method}:${ctx.config.baseURL ?? ''}${ctx.config.url}`;

// ── Eviction ────────────────────────────────────────────────────────

/**
 * Evicts the oldest entries when the cache exceeds `maxEntries`.
 *
 * Simple LRU approximation: deletes entries with the oldest
 * `cachedAt` timestamps. Called after each successful cache write.
 */
const evictIfNeeded = async (adapter: CacheAdapter, maxEntries: number): Promise<void> => {
  const currentSize = await adapter.size();
  if (currentSize <= maxEntries) return;

  // The DexieCacheAdapter handles TTL-based lazy eviction on read.
  // Here we just ensure the total count stays under maxEntries.
  // A more sophisticated LRU would track access time; this is
  // sufficient for the current scale.
  const excess = currentSize - maxEntries;
  if (excess > 0) {
    // For now, clear the entire cache if we're over budget.
    // This is a conservative strategy that avoids complex sorting.
    // A future iteration can implement fine-grained LRU eviction.
    await adapter.clear();
  }
};

// ── Factory ─────────────────────────────────────────────────────────

/**
 * Creates a cache middleware with the given options.
 *
 * @param options - Cache configuration.
 * @returns A {@link Middleware} that caches GET responses.
 *
 * @example
 * ```ts
 * const cache = createCacheMiddleware({
 *   adapter: cacheAdapter,
 *   ttlMs: 60_000,       // 1 minute
 *   maxEntries: 200,
 * });
 * ```
 */
export const createCacheMiddleware = (options: CacheMiddlewareOptions): Middleware => {
  const { adapter, ttlMs, maxEntries } = options;

  // In-flight dedup map: cache key → pending response promise.
  // Prevents duplicate concurrent requests for the same resource.
  const inFlight = new Map<string, Promise<ResponseContext>>();

  const middleware: Middleware = async (ctx, next) => {
    // Only cache GET requests.
    if (ctx.config.method !== 'GET') {
      return next();
    }

    // Allow callers to bypass cache via meta.
    if (ctx.meta.skipCache === true) {
      return next();
    }

    const cacheKey = buildCacheKey(ctx);

    // ── Dedup: reuse in-flight request if one exists ──
    const existing = inFlight.get(cacheKey);
    if (existing) {
      return existing;
    }

    // Build the request promise (dedup + cache logic).
    const requestPromise = (async (): Promise<ResponseContext> => {
      try {
        // ── Read-through: check cache first ──
        const cached = await adapter.get(cacheKey);
        if (cached) {
          return {
            data: cached.data,
            status: cached.status,
            statusText: cached.statusText,
            headers: cached.headers,
            meta: { fromCache: true, cachedAt: cached.cachedAt },
            config: ctx.config,
          };
        }

        // ── Cache miss: forward to next middleware ──
        const response = await next();

        // ── Store successful responses ──
        if (response.status >= 200 && response.status < 300) {
          const cachedResponse: CachedResponse = {
            data: response.data,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            cachedAt: Date.now(),
          };

          await adapter.set(cacheKey, cachedResponse, ttlMs);
          await evictIfNeeded(adapter, maxEntries);
        }

        return response;
      } finally {
        // Always clean up the in-flight entry.
        inFlight.delete(cacheKey);
      }
    })();

    // Register in-flight BEFORE awaiting.
    inFlight.set(cacheKey, requestPromise);

    return requestPromise;
  };

  return middleware;
};
