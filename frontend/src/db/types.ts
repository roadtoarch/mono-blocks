/**
 * IndexedDB entity types for the offline persistence layer.
 *
 * These types define the Dexie table schemas used by the pin registry,
 * query cache, and (Phase 4) outbox mutation queue.
 *
 * @module db/types
 */

// ── Pinned Records ─────────────────────────────────────────────────

/**
 * A user-pinned record whose cached data should survive cache eviction.
 *
 * The pin table is NEVER cleared by cache eviction — only by explicit
 * user unpin actions (DEC-8: per-record pinning).
 *
 * Composite key: `[userId+contentType+contentId]`
 */
export interface PinnedRecord {
  /** OIDC subject (sub claim). */
  userId: string;
  /**
   * Singular entity type extracted from the query key convention.
   * E.g. `'user'`, `'me'`.
   */
  contentType: string;
  /** Backend identifier for the specific record. */
  contentId: string;
  /** ISO timestamp of when the record was pinned. */
  pinnedAt: string;
  /** Estimated size of the cached data in bytes (updated on persist). */
  estimatedSizeBytes: number;
}

// ── Cached Queries ─────────────────────────────────────────────────

/**
 * A single TanStack Query cache entry stored in IndexedDB.
 *
 * The persister decomposes the `PersistedClient` into individual records
 * so that pin-aware filtering can operate per-query rather than on the
 * entire blob.
 */
export interface CachedQuery {
  /** TanStack Query hash — unique identifier for the query. */
  queryHash: string;
  /** The original query key (JSON-serialised). */
  queryKey: string;
  /** Serialised `QueryState` JSON. */
  state: string;
  /** Timestamp from the `PersistedClient` envelope. */
  timestamp: number;
  /** Buster string from the `PersistedClient` envelope. */
  buster: string;
  /**
   * Record IDs extracted from the query key by `parseQueryKey`.
   * Empty for list queries; contains the record ID for detail queries.
   */
  recordIds: string[];
  /**
   * Singular entity type extracted from the query key.
   * E.g. `'user'`, `'me'`.
   */
  entityType: string;
}

// ── HTTP Cache Entries ───────────────────────────────────────────────

/**
 * A cached HTTP response stored by the cache middleware.
 *
 * Keyed by the request URL, enabling read-through caching for GET
 * requests when offline.
 */
export interface HttpCacheEntry {
  /** Cache key — derived from the request URL. */
  key: string;
  /** Serialised response body (JSON). */
  data: string;
  /** HTTP status code. */
  status: number;
  /** HTTP status text. */
  statusText: string;
  /** Serialised response headers (JSON). */
  headers: string;
  /** Epoch timestamp (ms) when this entry was cached. */
  cachedAt: number;
  /** TTL in milliseconds for this entry. */
  ttlMs: number;
}

// ── Pending Mutations (Phase 4 — schema only) ─────────────────────

/**
 * An outbox mutation queued for replay when connectivity returns.
 *
 * Phase 4 will implement the OutboxAdapter; the table schema is declared
 * now so that Dexie version 1 is stable and future changes are additive.
 */
export interface PendingMutation {
  /** Auto-incremented primary key. */
  id: number;
  /** OIDC subject (sub claim) of the originating user. */
  userId: string;
  /** Singular entity type, e.g. `'user'`. */
  contentType: string;
  /** Backend identifier of the target record (empty for creates). */
  contentId: string;
  /** HTTP method to replay. */
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Request URL path. */
  url: string;
  /** Serialised request headers (JSON). */
  headers: string;
  /** Serialised request body (JSON). */
  body: string;
  /** ISO timestamp of when the mutation was created. */
  createdAt: string;
  /** Current lifecycle status. */
  status: 'pending' | 'syncing' | 'failed';
  /**
   * How many times the sync engine has attempted to replay this mutation.
   *
   * After `MAX_RETRY_COUNT` (3) attempts, the mutation is marked `failed`
   * and surfaced to the user for manual action (6.3).
   */
  retryCount: number;
  /** ISO timestamp of the most recent replay attempt (undefined on first attempt). */
  retriedAt?: string;
}
