/**
 * Dexie database for the offline persistence layer.
 *
 * Defines three tables:
 * - **pins** — per-record pin registry (survives cache eviction)
 * - **cachedQueries** — individual TanStack Query cache entries
 * - **mutations** — outbox queue (Phase 4; schema declared now)
 *
 * @module db/app-db
 */

import Dexie, { type EntityTable, type Table } from 'dexie';

import type { CachedQuery, HttpCacheEntry, PendingMutation, PinnedRecord } from './types';

/**
 * Application-level IndexedDB database.
 *
 * Uses Dexie 4 `EntityTable` for fully typed table access.
 * The `pins` table uses a compound primary key, so it's typed with
 * `Table` instead of `EntityTable` (which requires a single-named key).
 */
class AppDB extends Dexie {
  /** Per-record pin registry — never evicted by cache logic. */
  pins!: Table<PinnedRecord>;
  /** Individual TanStack Query cache entries. */
  cachedQueries!: EntityTable<CachedQuery, 'queryHash'>;
  /** Outbox mutation queue. */
  mutations!: EntityTable<PendingMutation, 'id'>;
  /** HTTP-level response cache (used by cache middleware). */
  httpCache!: EntityTable<HttpCacheEntry, 'key'>;

  constructor() {
    super('MonoBlocksDB');

    this.version(1).stores({
      pins: '[userId+contentType+contentId], userId, [userId+contentType]',
      cachedQueries: 'queryHash, entityType',
      mutations: '++id, status, [userId+status], createdAt',
    });

    // Version 2: add HTTP response cache for the cache middleware.
    // Only adds a new table — no changes to v1 schemas.
    this.version(2).stores({
      httpCache: 'key, cachedAt',
    });
  }
}

/**
 * Singleton database instance.
 *
 * Import this — never instantiate `AppDB` yourself.
 * Dexie opens/creates the database on first access.
 */
export const db = new AppDB();

export { AppDB };
