/**
 * Outbox sync engine — drains pending mutations when connectivity returns.
 *
 * On the `online` browser event (or on explicit `sync()` call), the
 * engine reads all `pending` mutations from the outbox, replays each
 * one through the FULL API client middleware pipeline (so auth
 * middleware re-attaches a fresh OIDC token), and either dequeues
 * on success or marks as failed.
 *
 * After a successful drain cycle, all TanStack Query caches that
 * correspond to the mutated entity types are invalidated so that
 * the UI reflects the server's current state.
 *
 * @module db/outbox-sync
 */

import type { PendingMutation } from './types';
import type { OutboxAdapter } from '@/http/middlewares/types';
import type { Transport } from '@/http/types';

// ── Types ───────────────────────────────────────────────────────────

/**
 * Configuration for the outbox sync engine.
 */
export interface OutboxSyncConfig {
  /** Outbox adapter for reading/mutating pending entries. */
  adapter: OutboxAdapter;
  /** API client transport — used to replay mutations through the full pipeline. */
  client: Transport;
  /** Callback to invalidate TanStack Query caches after successful sync. */
  invalidateQueries: (entityTypes: Set<string>) => void;
  /** Maximum consecutive failures before stopping the drain (prevents infinite loops). */
  maxConsecutiveFailures?: number;
}

/**
 * Result of a sync cycle.
 */
export interface SyncResult {
  /** Number of mutations successfully replayed. */
  replayed: number;
  /** Number of mutations that failed during this cycle. */
  failed: number;
  /** Entity types that were mutated (for query invalidation). */
  entityTypes: Set<string>;
}

// ── Sync engine ─────────────────────────────────────────────────────

/**
 * Creates an outbox sync engine.
 *
 * The engine does NOT auto-start.  Call `start()` to begin listening
 * for the `online` event, or call `sync()` manually to trigger a
 * drain cycle.
 *
 * @param config - Sync engine configuration.
 * @returns An object with `sync()`, `start()`, and `stop()` methods.
 *
 * @example
 * ```ts
 * const engine = createOutboxSyncEngine({
 *   adapter: outboxAdapter,
 *   client: defaultClient,
 *   invalidateQueries: (types) => {
 *     for (const type of types) queryClient.invalidateQueries({ queryKey: [type] });
 *   },
 * });
 *
 * engine.start(); // listens for 'online' event
 * ```
 */
export const createOutboxSyncEngine = (config: OutboxSyncConfig) => {
  const { adapter, client, invalidateQueries, maxConsecutiveFailures = 5 } = config;

  let isSyncing = false;
  let onlineHandler: (() => void) | undefined;

  // ── Single mutation replay ────────────────────────────────────

  /**
   * Replays a single pending mutation through the full middleware pipeline.
   *
   * Returns `true` on success, `false` on failure.
   */
  const replayMutation = async (mutation: PendingMutation): Promise<boolean> => {
    try {
      await client({
        config: {
          url: mutation.url,
          method: mutation.method,
          headers: JSON.parse(mutation.headers) as Record<string, string>,
          data: JSON.parse(mutation.body) as unknown,
        },
        meta: {
          // Skip offline middleware during replay (we're online).
          skipOffline: true,
          // Skip cache middleware for mutations.
          skipCache: true,
          // Skip retry middleware for replayed mutations —
          // the sync engine handles retries at a higher level.
          maxRetries: 0,
        },
      });

      return true;
    } catch {
      return false;
    }
  };

  // ── Drain cycle ──────────────────────────────────────────────

  /**
   * Drains all pending mutations from the outbox.
   *
   * Processes mutations in `createdAt` order. Stops early if
   * `maxConsecutiveFailures` consecutive replays fail (suggests
   * a systemic issue rather than a per-mutation problem).
   */
  const sync = async (): Promise<SyncResult> => {
    if (isSyncing) {
      return { replayed: 0, failed: 0, entityTypes: new Set() };
    }

    isSyncing = true;
    const entityTypes = new Set<string>();
    let replayed = 0;
    let failed = 0;
    let consecutiveFailures = 0;

    try {
      const pending = await adapter.getPending();

      for (const mutation of pending) {
        // Mark as syncing to prevent double-drain.
        await adapter.markSyncing(mutation.id);

        const success = await replayMutation(mutation);

        if (success) {
          await adapter.dequeue(mutation.id);
          entityTypes.add(mutation.contentType);
          replayed++;
          consecutiveFailures = 0;
        } else {
          await adapter.markFailed(mutation.id);
          failed++;
          consecutiveFailures++;

          if (consecutiveFailures >= maxConsecutiveFailures) {
            break;
          }
        }
      }

      // Invalidate affected query caches.
      if (entityTypes.size > 0) {
        invalidateQueries(entityTypes);
      }
    } finally {
      isSyncing = false;
    }

    return { replayed, failed, entityTypes };
  };

  // ── Lifecycle ────────────────────────────────────────────────

  /**
   * Starts listening for the browser `online` event.
   *
   * When the browser transitions from offline to online, a sync
   * cycle is automatically triggered.
   */
  const start = (): void => {
    if (onlineHandler) return; // Already started.

    onlineHandler = () => {
      void sync();
    };

    window.addEventListener('online', onlineHandler);
  };

  /**
   * Stops listening for the browser `online` event.
   */
  const stop = (): void => {
    if (!onlineHandler) return;

    window.removeEventListener('online', onlineHandler);
    onlineHandler = undefined;
  };

  return { sync, start, stop };
};
