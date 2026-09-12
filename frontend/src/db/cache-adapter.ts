/**
 * Dexie-backed CacheAdapter for the HTTP cache middleware.
 *
 * Stores cached HTTP responses in the `httpCache` Dexie table,
 * keyed by the request URL.  TTL enforcement happens at read time:
 * entries past their TTL are treated as misses and lazily evicted.
 *
 * @module db/cache-adapter
 */

import { db } from './app-db';

import type { HttpCacheEntry } from './types';
import type { CacheAdapter, CachedResponse } from '@/http/middlewares/types';

/**
 * Production CacheAdapter backed by the Dexie `httpCache` table.
 *
 * Serialises response data and headers to JSON strings for IDB storage.
 * TTL is stored per-entry so different endpoints can have different
 * freshness windows.
 */
export class DexieCacheAdapter implements CacheAdapter {
  async get(key: string): Promise<CachedResponse | undefined> {
    const entry = await db.httpCache.get(key);
    if (!entry) return undefined;

    // TTL check: expired entries are treated as misses.
    if (Date.now() > entry.cachedAt + entry.ttlMs) {
      // Lazy eviction — remove the stale entry.
      await db.httpCache.delete(key);
      return undefined;
    }

    return {
      data: JSON.parse(entry.data) as unknown,
      status: entry.status,
      statusText: entry.statusText,
      headers: JSON.parse(entry.headers) as Record<string, string>,
      cachedAt: entry.cachedAt,
    };
  }

  async set(key: string, response: CachedResponse, ttlMs?: number): Promise<void> {
    const entry: HttpCacheEntry = {
      key,
      data: JSON.stringify(response.data),
      status: response.status,
      statusText: response.statusText,
      headers: JSON.stringify(response.headers),
      cachedAt: response.cachedAt,
      ttlMs: ttlMs ?? 0,
    };

    await db.httpCache.put(entry);
  }

  async delete(key: string): Promise<void> {
    await db.httpCache.delete(key);
  }

  async clear(): Promise<void> {
    await db.httpCache.clear();
  }

  async size(): Promise<number> {
    return db.httpCache.count();
  }
}

/**
 * Default singleton adapter instance.
 *
 * Import this — never instantiate `DexieCacheAdapter` yourself
 * (outside of tests).
 */
export const cacheAdapter = new DexieCacheAdapter();
