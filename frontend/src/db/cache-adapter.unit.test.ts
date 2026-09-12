/**
 * Unit tests for db/cache-adapter — Dexie-backed HTTP response cache.
 *
 * Uses fake-indexeddb (global setup in test-setup.ts) so Dexie
 * operates against an in-memory IDB instead of the browser.
 *
 * @module db/cache-adapter.unit.test
 */

import { db } from './app-db';
import { DexieCacheAdapter } from './cache-adapter';

import type { CachedResponse } from '@/http/middlewares/types';

// ── Helpers ─────────────────────────────────────────────────────────

/** Creates a valid CachedResponse for testing. */
function makeResponse(overrides?: Partial<CachedResponse>): CachedResponse {
  return {
    data: { id: 1, name: 'Test' },
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    cachedAt: Date.now(),
    ...overrides,
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterAll(async () => {
  await db.delete();
});

// ── get ─────────────────────────────────────────────────────────────

describe('DexieCacheAdapter.get', () => {
  it('returns undefined for a missing key', async () => {
    const adapter = new DexieCacheAdapter();
    const result = await adapter.get('/api/users');
    expect(result).toBeUndefined();
  });

  it('returns the cached response for an existing key', async () => {
    const adapter = new DexieCacheAdapter();
    const response = makeResponse();
    await adapter.set('/api/users', response, 60_000);

    const result = await adapter.get('/api/users');
    expect(result).toBeDefined();
    expect(result!.data).toEqual(response.data);
    expect(result!.status).toBe(200);
    expect(result!.statusText).toBe('OK');
    expect(result!.headers).toEqual(response.headers);
    expect(result!.cachedAt).toBe(response.cachedAt);
  });

  it('returns undefined and evicts expired entries (TTL check)', async () => {
    const adapter = new DexieCacheAdapter();
    const response = makeResponse({ cachedAt: Date.now() - 120_000 }); // 2 min ago
    await adapter.set('/api/users', response, 60_000); // 1 min TTL

    const result = await adapter.get('/api/users');
    expect(result).toBeUndefined();

    // Entry should be removed from IDB (lazy eviction).
    const entry = await db.httpCache.get('/api/users');
    expect(entry).toBeUndefined();
  });

  it('returns fresh entries within TTL', async () => {
    const adapter = new DexieCacheAdapter();
    const response = makeResponse({ cachedAt: Date.now() - 30_000 }); // 30s ago
    await adapter.set('/api/users', response, 60_000); // 1 min TTL

    const result = await adapter.get('/api/users');
    expect(result).toBeDefined();
    expect(result!.status).toBe(200);
  });

  it('treats ttlMs=0 as immediately expired', async () => {
    const adapter = new DexieCacheAdapter();
    // cachedAt 1ms in the past ensures Date.now() > cachedAt + 0 is true.
    const response = makeResponse({ cachedAt: Date.now() - 1 });
    await adapter.set('/api/users', response, 0); // ttlMs=0

    const result = await adapter.get('/api/users');
    expect(result).toBeUndefined();
  });
});

// ── set ─────────────────────────────────────────────────────────────

describe('DexieCacheAdapter.set', () => {
  it('stores a new entry in IDB', async () => {
    const adapter = new DexieCacheAdapter();
    await adapter.set('/api/users', makeResponse(), 60_000);

    const entry = await db.httpCache.get('/api/users');
    expect(entry).toBeDefined();
    expect(entry!.key).toBe('/api/users');
    expect(JSON.parse(entry!.data)).toEqual({ id: 1, name: 'Test' });
    expect(entry!.status).toBe(200);
    expect(JSON.parse(entry!.headers)).toEqual({ 'content-type': 'application/json' });
    expect(entry!.ttlMs).toBe(60_000);
  });

  it('overwrites an existing entry (upsert)', async () => {
    const adapter = new DexieCacheAdapter();
    await adapter.set('/api/users', makeResponse({ status: 200 }), 60_000);
    await adapter.set('/api/users', makeResponse({ status: 201 }), 30_000);

    const entry = await db.httpCache.get('/api/users');
    expect(entry!.status).toBe(201);
    expect(entry!.ttlMs).toBe(30_000);
  });

  it('defaults ttlMs to 0 when not provided', async () => {
    const adapter = new DexieCacheAdapter();
    await adapter.set('/api/users', makeResponse());

    const entry = await db.httpCache.get('/api/users');
    expect(entry!.ttlMs).toBe(0);
  });
});

// ── delete ──────────────────────────────────────────────────────────

describe('DexieCacheAdapter.delete', () => {
  it('removes an entry by key', async () => {
    const adapter = new DexieCacheAdapter();
    await adapter.set('/api/users', makeResponse(), 60_000);
    await adapter.delete('/api/users');

    const entry = await db.httpCache.get('/api/users');
    expect(entry).toBeUndefined();
  });

  it('does nothing for a missing key', async () => {
    const adapter = new DexieCacheAdapter();
    // Should not throw.
    await adapter.delete('/api/nonexistent');
  });
});

// ── clear ───────────────────────────────────────────────────────────

describe('DexieCacheAdapter.clear', () => {
  it('removes all entries', async () => {
    const adapter = new DexieCacheAdapter();
    await adapter.set('/api/users', makeResponse(), 60_000);
    await adapter.set('/api/me', makeResponse(), 60_000);
    await adapter.clear();

    const count = await db.httpCache.count();
    expect(count).toBe(0);
  });
});

// ── size ────────────────────────────────────────────────────────────

describe('DexieCacheAdapter.size', () => {
  it('returns 0 for an empty cache', async () => {
    const adapter = new DexieCacheAdapter();
    expect(await adapter.size()).toBe(0);
  });

  it('returns the number of stored entries', async () => {
    const adapter = new DexieCacheAdapter();
    await adapter.set('/api/users', makeResponse(), 60_000);
    await adapter.set('/api/me', makeResponse(), 60_000);
    expect(await adapter.size()).toBe(2);
  });
});
