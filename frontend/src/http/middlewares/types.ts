/**
 * Adapter interfaces for the cache and offline middleware.
 *
 * These interfaces decouple the middleware layer from the storage
 * implementation (Dexie).  Production uses the Dexie adapters; tests
 * can swap in in-memory fakes.
 *
 * @module http/middlewares/types
 */

import type { PendingMutation } from '@/db/types';

// ── Cached HTTP response ───────────────────────────────────────────

/**
 * A cached HTTP response stored by the CacheAdapter.
 *
 * Includes a `cachedAt` timestamp so the cache middleware can enforce
 * TTL-based freshness.
 */
export interface CachedResponse {
  /** Deserialized response body. */
  data: unknown;
  /** HTTP status code. */
  status: number;
  /** HTTP status text. */
  statusText: string;
  /** Response headers. */
  headers: Record<string, string>;
  /** Epoch timestamp (ms) when this entry was cached. */
  cachedAt: number;
}

// ── CacheAdapter ────────────────────────────────────────────────────

/**
 * Contract for a key-value HTTP response cache.
 *
 * Used by the cache middleware for read-through caching:
 * - On request: `get(key)` → return cached response if fresh
 * - On response: `set(key, response, ttl)` → store for future reads
 *
 * Implementations may back this with IndexedDB, an in-memory Map,
 * or any other store.
 */
export interface CacheAdapter {
  /** Retrieve a cached response by key. Returns `undefined` on miss. */
  get(key: string): Promise<CachedResponse | undefined>;
  /** Store a response with an optional TTL override (ms). */
  set(key: string, response: CachedResponse, ttlMs?: number): Promise<void>;
  /** Remove a single entry. */
  delete(key: string): Promise<void>;
  /** Remove all entries. */
  clear(): Promise<void>;
  /** Return the number of cached entries (for eviction decisions). */
  size(): Promise<number>;
}

// ── OutboxAdapter ───────────────────────────────────────────────────

/**
 * Contract for the offline outbox (pending mutation queue).
 *
 * Used by the offline middleware to persist mutations when the
 * client is offline, and by the sync engine to drain and replay
 * them when connectivity returns.
 *
 * Lifecycle: `pending` → `syncing` → (success: `dequeue`) | (failure: `failed`)
 *
 * Failed entries remain in the outbox for inspection or retry;
 * they are never automatically re-synced without explicit action.
 */
export interface OutboxAdapter {
  /** Add a mutation to the outbox. Returns the auto-generated ID. */
  enqueue(mutation: Omit<PendingMutation, 'id'>): Promise<number>;
  /** Remove a successfully replayed mutation. */
  dequeue(id: number): Promise<void>;
  /** Mark a mutation as currently being synced (prevents double-drain). */
  markSyncing(id: number): Promise<void>;
  /** Mark a mutation as failed after replay attempts are exhausted. */
  markFailed(id: number): Promise<void>;
  /**
   * Increment a mutation's `retryCount` and reset it to `pending`
   * for the next sync cycle. Returns the updated retry count.
   *
   * If `retryCount` already equals `maxRetries`, the mutation
   * should be marked `failed` instead of retried.
   */
  retry(id: number, maxRetries: number): Promise<number>;
  /** Return all mutations in `pending` status (for sync engine). */
  getPending(): Promise<PendingMutation[]>;
  /** Return all mutations in `failed` status (for UI / retry). */
  getFailed(): Promise<PendingMutation[]>;
  /** Return the count of pending mutations (for badge / indicator). */
  count(): Promise<number>;
  /** Return the count of failed mutations (for error notification). */
  failedCount(): Promise<number>;
}
