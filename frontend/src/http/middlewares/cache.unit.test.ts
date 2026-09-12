/**
 * Unit tests for http/middlewares/cache — read-through HTTP response cache.
 *
 * Uses an in-memory mock CacheAdapter instead of Dexie to keep
 * middleware tests fast and isolated from IDB.
 *
 * @module http/middlewares/cache.unit.test
 */

import { createCacheMiddleware } from './cache';

import type { CacheAdapter, CachedResponse } from './types';
import type { RequestContext, ResponseContext } from '../types';

// ── In-memory mock CacheAdapter ─────────────────────────────────────

/** Creates a mock CacheAdapter backed by a Map. */
function createMockCacheAdapter(): CacheAdapter & { store: Map<string, CachedResponse> } {
  const store = new Map<string, CachedResponse & { ttlMsOverride?: number }>();

  return {
    store: store,

    async get(key: string) {
      const entry = store.get(key);
      if (!entry) return undefined;

      // Simulate TTL check: expired entries are misses.
      const ttl = entry.ttlMsOverride ?? 60_000;
      if (Date.now() > entry.cachedAt + ttl) return undefined;

      return entry;
    },

    async set(key: string, response: CachedResponse, ttlMs?: number) {
      store.set(key, { ...response, ttlMsOverride: ttlMs });
    },

    async delete(key: string) {
      store.delete(key);
    },

    async clear() {
      store.clear();
    },

    async size() {
      return store.size;
    },
  };
}

// ── Test fixtures ───────────────────────────────────────────────────

/** Creates a RequestContext for a GET request. */
function makeGetCtx(url: string, overrides?: Partial<RequestContext['config']>): RequestContext {
  return {
    config: { method: 'GET', url, ...overrides },
    meta: {},
  };
}

/** Creates a RequestContext for a POST request. */
function makePostCtx(url: string, data?: unknown): RequestContext {
  return {
    config: { method: 'POST', url, data },
    meta: {},
  };
}

/** Creates a successful ResponseContext. */
function makeResponse(ctx: RequestContext, status = 200, data?: unknown): ResponseContext {
  return {
    data: data ?? { ok: true },
    status,
    statusText: status === 200 ? 'OK' : 'Created',
    headers: { 'content-type': 'application/json' },
    meta: {},
    config: ctx.config,
  };
}

/** Creates a next() function that returns a specific response. */
const nextWith = (response: ResponseContext) => async () => response;

// ── Tests ───────────────────────────────────────────────────────────

describe('createCacheMiddleware', () => {
  it('passes through non-GET requests without caching', async () => {
    const adapter = createMockCacheAdapter();
    const cache = createCacheMiddleware({ adapter, ttlMs: 60_000, maxEntries: 100 });
    const ctx = makePostCtx('/api/users', { name: 'Alice' });
    const response = makeResponse(ctx, 201);

    const result = await cache(ctx, nextWith(response));

    expect(result.status).toBe(201);
    expect(adapter.store.size).toBe(0);
  });

  it('caches successful GET responses', async () => {
    const adapter = createMockCacheAdapter();
    const cache = createCacheMiddleware({ adapter, ttlMs: 60_000, maxEntries: 100 });
    const ctx = makeGetCtx('/api/users');
    const response = makeResponse(ctx);

    await cache(ctx, nextWith(response));

    expect(adapter.store.size).toBe(1);
    expect(adapter.store.has('GET:/api/users')).toBe(true);
  });

  it('does not cache non-2xx responses', async () => {
    const adapter = createMockCacheAdapter();
    const cache = createCacheMiddleware({ adapter, ttlMs: 60_000, maxEntries: 100 });
    const ctx = makeGetCtx('/api/users');
    const response = makeResponse(ctx, 500);

    await cache(ctx, nextWith(response));

    expect(adapter.store.size).toBe(0);
  });

  it('returns cached response on cache hit with fromCache meta', async () => {
    const adapter = createMockCacheAdapter();
    const cache = createCacheMiddleware({ adapter, ttlMs: 60_000, maxEntries: 100 });

    // First request: cache miss → store in cache.
    const ctx1 = makeGetCtx('/api/users');
    const fresh = makeResponse(ctx1, 200, { users: [] });
    await cache(ctx1, nextWith(fresh));

    // Second request: cache hit.
    const ctx2 = makeGetCtx('/api/users');
    const result = await cache(ctx2, async () => {
      throw new Error('Should not call next on cache hit');
    });

    expect(result.data).toEqual({ users: [] });
    expect(result.meta.fromCache).toBe(true);
    expect(result.meta.cachedAt).toBeDefined();
  });

  it('calls next on cache miss and stores the response', async () => {
    const adapter = createMockCacheAdapter();
    const cache = createCacheMiddleware({ adapter, ttlMs: 60_000, maxEntries: 100 });
    const ctx = makeGetCtx('/api/users');
    let nextCalled = false;

    const result = await cache(ctx, async () => {
      nextCalled = true;
      return makeResponse(ctx, 200, { id: 1 });
    });

    expect(nextCalled).toBe(true);
    expect(result.data).toEqual({ id: 1 });
    expect(result.meta.fromCache).toBeUndefined();
  });

  it('bypasses cache when ctx.meta.skipCache is true', async () => {
    const adapter = createMockCacheAdapter();
    const cache = createCacheMiddleware({ adapter, ttlMs: 60_000, maxEntries: 100 });

    // Pre-populate cache.
    const ctx1 = makeGetCtx('/api/users');
    await cache(ctx1, nextWith(makeResponse(ctx1)));

    // Skip cache on second request.
    const ctx2: RequestContext = {
      config: { method: 'GET', url: '/api/users' },
      meta: { skipCache: true },
    };
    let nextCalled = false;

    const result = await cache(ctx2, async () => {
      nextCalled = true;
      return makeResponse(ctx2, 200, { fresh: true });
    });

    expect(nextCalled).toBe(true);
    expect(result.data).toEqual({ fresh: true });
  });

  it('deduplicates concurrent requests for the same cache key', async () => {
    const adapter = createMockCacheAdapter();
    const cache = createCacheMiddleware({ adapter, ttlMs: 60_000, maxEntries: 100 });

    let transportCallCount = 0;

    const slowNext = async () => {
      transportCallCount++;
      // Simulate a slow transport.
      await new Promise((r) => setTimeout(r, 50));
      return makeResponse(makeGetCtx('/api/users'), 200, { count: transportCallCount });
    };

    // Fire two concurrent requests for the same URL.
    const ctx1 = makeGetCtx('/api/users');
    const ctx2 = makeGetCtx('/api/users');

    const [res1, res2] = await Promise.all([cache(ctx1, slowNext), cache(ctx2, slowNext)]);

    // Transport should only be called once (dedup).
    expect(transportCallCount).toBe(1);
    expect(res1.data).toEqual({ count: 1 });
    expect(res2.data).toEqual({ count: 1 });
  });

  it('evicts cache when maxEntries is exceeded', async () => {
    const adapter = createMockCacheAdapter();
    const cache = createCacheMiddleware({ adapter, ttlMs: 60_000, maxEntries: 2 });

    // Store 3 entries (maxEntries = 2).
    for (let i = 0; i < 3; i++) {
      const ctx = makeGetCtx(`/api/item-${String(i)}`);
      await cache(ctx, nextWith(makeResponse(ctx)));
    }

    // After eviction (clear-on-over-budget), cache should be cleared.
    // The 3rd write triggers eviction which clears all entries.
    expect(adapter.store.size).toBe(0);
  });

  it('includes baseURL in cache key to avoid collisions', async () => {
    const adapter = createMockCacheAdapter();
    const cache = createCacheMiddleware({ adapter, ttlMs: 60_000, maxEntries: 100 });

    const ctx1: RequestContext = {
      config: { method: 'GET', url: '/api/users', baseURL: 'https://a.com' },
      meta: {},
    };
    const ctx2: RequestContext = {
      config: { method: 'GET', url: '/api/users', baseURL: 'https://b.com' },
      meta: {},
    };

    await cache(ctx1, nextWith(makeResponse(ctx1, 200, { source: 'a' })));
    await cache(ctx2, nextWith(makeResponse(ctx2, 200, { source: 'b' })));

    expect(adapter.store.size).toBe(2);
    expect(adapter.store.has('GET:https://a.com/api/users')).toBe(true);
    expect(adapter.store.has('GET:https://b.com/api/users')).toBe(true);
  });
});
