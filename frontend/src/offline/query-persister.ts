/**
 * Dexie-backed TanStack Query persister with pin-aware filtering.
 *
 * Implements the {@link Persister} interface from
 * `@tanstack/react-query-persist-client` using the `cachedQueries`
 * Dexie table. Before persisting, each query is checked against the
 * pin registry:
 *
 * - **Detail queries** are persisted only if the specific record is pinned.
 * - **List queries** are persisted if ANY record of the same entity
 *   type is pinned (heuristic: the user actively uses this entity
 *   offline).
 *
 * Unpinned queries are silently dropped — they will not be restored
 * on the next session. This prevents unbounded IDB growth while
 * ensuring pinned data survives cache eviction.
 *
 * @module offline/query-persister
 */

import { db } from '../db/app-db';

import { parseQueryKey } from './parse-query-key';

import type { PinAdapter } from './pin-adapter';
import type { CachedQuery } from '../db/types';
import type { Persister } from '@tanstack/react-query-persist-client';

// ── Local types ────────────────────────────────────────────────────

/**
 * Shape of a single dehydrated query as it appears in TanStack Query's
 * `DehydratedState.queries` array.
 *
 * Defined locally because `DehydratedQuery` is not exported from
 * `@tanstack/query-core`. Matches the internal interface exactly.
 */
interface DehydratedQueryEntry {
  queryHash: string;
  queryKey: readonly unknown[];
  state: unknown;
  promise?: Promise<unknown>;
  meta?: Record<string, unknown>;
  queryType?: 'infinite';
  dehydratedAt?: number;
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Determines whether a dehydrated query should be persisted based on
 * the current pin registry state.
 */
async function shouldPersistQuery(
  queryKey: readonly unknown[],
  adapter: PinAdapter,
  userId: string,
): Promise<boolean> {
  const parsed = parseQueryKey(queryKey);

  if (parsed.type === 'detail') {
    if (!parsed.recordId) return false;
    return adapter.isPinned(userId, parsed.entityType, parsed.recordId);
  }

  // List query: persist if ANY record of this entity type is pinned.
  const pins = await adapter.getByEntityType(userId, parsed.entityType);
  return pins.length > 0;
}

/**
 * Converts a dehydrated query entry into a `CachedQuery` row for Dexie.
 */
function toCachedQuery(
  query: DehydratedQueryEntry,
  timestamp: number,
  buster: string,
): CachedQuery {
  const parsed = parseQueryKey(query.queryKey);

  return {
    queryHash: query.queryHash,
    queryKey: JSON.stringify(query.queryKey),
    state: JSON.stringify(query.state),
    timestamp,
    buster,
    recordIds: parsed.recordId ? [parsed.recordId] : [],
    entityType: parsed.entityType,
  };
}

/**
 * Reconstructs a dehydrated query entry from a `CachedQuery` row.
 */
function toDehydratedQuery(row: CachedQuery): DehydratedQueryEntry {
  return {
    queryHash: row.queryHash,
    queryKey: JSON.parse(row.queryKey) as readonly unknown[],
    state: JSON.parse(row.state),
  };
}

// ── Factory ────────────────────────────────────────────────────────

/**
 * Creates a Dexie-backed persister with pin-aware filtering.
 *
 * @param adapter - Pin registry adapter for checking pin state.
 * @param getUserId - Async function that returns the current user's ID
 *   (OIDC `sub` claim). Called on each persist cycle.
 * @returns A TanStack Query `Persister` implementation.
 */
export function createDexiePersister(
  adapter: PinAdapter,
  getUserId: () => Promise<string | undefined> | string | undefined,
): Persister {
  return {
    async persistClient(client): Promise<void> {
      const userId = await getUserId();
      if (!userId) {
        // Not authenticated — clear stale cache and skip.
        await db.cachedQueries.clear();
        return;
      }

      const queries = client.clientState.queries as unknown as DehydratedQueryEntry[];

      // Filter queries by pin-aware rules.
      const shouldPersistFlags = await Promise.all(
        queries.map((q) => shouldPersistQuery(q.queryKey, adapter, userId)),
      );

      const filteredQueries = queries.filter((_, i) => shouldPersistFlags[i]);

      if (filteredQueries.length === 0) {
        await db.cachedQueries.clear();
        return;
      }

      // Upsert individual query records.
      const rows = filteredQueries.map((q) => toCachedQuery(q, client.timestamp, client.buster));

      // Clear first, then bulk-put to avoid stale entries.
      await db.transaction('rw', db.cachedQueries, async () => {
        await db.cachedQueries.clear();
        await db.cachedQueries.bulkPut(rows);
      });

      // Update estimated sizes on pinned records (best-effort).
      await updatePinSizes(adapter, userId, rows);
    },

    async restoreClient(): Promise<
      import('@tanstack/react-query-persist-client').PersistedClient | undefined
    > {
      const rows = await db.cachedQueries.toArray();
      if (rows.length === 0) return undefined;

      // Reconstruct PersistedClient. The queries array must be cast because
      // DehydratedQuery (internal to @tanstack/query-core) is not exported.
      const restored: import('@tanstack/react-query-persist-client').PersistedClient = {
        timestamp: rows[0].timestamp,
        buster: rows[0].buster,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        clientState: { queries: rows.map(toDehydratedQuery) as any, mutations: [] },
      };
      return restored;
    },

    async removeClient(): Promise<void> {
      await db.cachedQueries.clear();
    },
  };
}

// ── Size tracking ──────────────────────────────────────────────────

/**
 * Updates `estimatedSizeBytes` on pinned records based on the
 * total size of their associated cached queries.
 *
 * Best-effort — failures are silently ignored so they don't block
 * the persist cycle.
 */
async function updatePinSizes(
  adapter: PinAdapter,
  userId: string,
  rows: CachedQuery[],
): Promise<void> {
  try {
    const sizeByEntity = new Map<string, number>();

    for (const row of rows) {
      const current = sizeByEntity.get(row.entityType) ?? 0;
      // Rough estimate: JSON string length ≈ bytes.
      sizeByEntity.set(row.entityType, current + row.state.length);
    }

    for (const [entityType, totalBytes] of sizeByEntity) {
      const pins = await adapter.getByEntityType(userId, entityType);
      const perRecord = pins.length > 0 ? Math.round(totalBytes / pins.length) : 0;
      for (const pin of pins) {
        await adapter.updateSize(userId, pin.contentType, pin.contentId, perRecord);
      }
    }
  } catch {
    // Best-effort — don't break persistence over size tracking failures.
  }
}
