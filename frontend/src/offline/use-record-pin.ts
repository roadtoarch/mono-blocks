/**
 * Hook for toggling per-record offline pin state (DEC-8).
 *
 * Provides the pin/unpin action and the current pinned status for a
 * single record. Only functional for users with the `OFFLINE_ALLOWED`
 * role — returns a no-op toggle and `isPinned: false` otherwise.
 *
 * @module offline/use-record-pin
 */

import { useCallback, useSyncExternalStore } from 'react';

import { useOfflineAllowed } from './use-offline-allowed';

import { pinAdapter } from '@/offline/pin-adapter';

// ── Pin state change subscription ──────────────────────────────────

/**
 * Minimal pub/sub for pin state changes so that `useRecordPin` can
 * re-read from IDB when another component pins/unpins the same record.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

function emitChange() {
  for (const fn of listeners) {
    fn();
  }
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ── Hook ───────────────────────────────────────────────────────────

export interface UseRecordPinOptions {
  /** Singular entity type (e.g. `'user'`). */
  contentType: string;
  /** Backend identifier for the record. */
  contentId: string;
  /** OIDC subject (sub claim) of the current user. */
  userId: string | undefined;
  /**
   * Whether new pins are allowed (storage budget check).
   *
   * When `false`, `toggle()` will only unpin — it will NOT create
   * new pins. This prevents over-committing storage when usage is
   * at or above 90% of the browser quota.
   *
   * @default true
   */
  canPin?: boolean;
}

export interface UseRecordPinResult {
  /** Whether the record is currently pinned for offline access. */
  isPinned: boolean;
  /** Toggle pin state. No-op if user lacks `OFFLINE_ALLOWED`. */
  toggle: () => Promise<void>;
}

/**
 * Reads the current pin state from IDB.
 *
 * Called by `useSyncExternalStore` on every subscription notification.
 * Returns `false` if the user is not authenticated.
 */
async function readPinState(
  userId: string | undefined,
  contentType: string,
  contentId: string,
): Promise<boolean> {
  if (!userId) return false;
  return pinAdapter.isPinned(userId, contentType, contentId);
}

/**
 * Hook that exposes per-record pin/unpin toggle and current state.
 *
 * Uses `useSyncExternalStore` to stay in sync with IDB changes
 * triggered by any component (e.g. a list view and a detail view
 * both showing the same record).
 */
export function useRecordPin({
  contentType,
  contentId,
  userId,
  canPin = true,
}: UseRecordPinOptions): UseRecordPinResult {
  const offlineAllowed = useOfflineAllowed();

  // useSyncExternalStore with an async snapshot.
  // The getSnapshot returns a cached value; getServerSnapshot returns false.
  // On subscription change, the hook re-renders and re-reads from IDB.
  const isPinned = useSyncExternalStore(
    subscribe,
    // Snapshot: synchronously returns cached value.
    // We use a module-level cache that's updated asynchronously.
    () => pinCache.get(cacheKey(userId, contentType, contentId)) ?? false,
    () => false, // server snapshot
  );

  const toggle = useCallback(async () => {
    if (!offlineAllowed || !userId) return;

    const key = cacheKey(userId, contentType, contentId);
    const currentlyPinned = pinCache.get(key) ?? false;

    if (currentlyPinned) {
      // Unpinning is always allowed — even at critical storage levels.
      await pinAdapter.unpin(userId, contentType, contentId);
      pinCache.set(key, false);
    } else {
      // Pinning is blocked when storage usage is ≥90%.
      if (!canPin) return;
      await pinAdapter.pin({ userId, contentType, contentId });
      pinCache.set(key, true);
    }

    emitChange();
  }, [offlineAllowed, userId, contentType, contentId, canPin]);

  // Kick off an async read on mount / when deps change.
  // This bridges the gap between useSyncExternalStore's synchronous
  // contract and IDB's async reads.
  //

  if (offlineAllowed && userId) {
    const key = cacheKey(userId, contentType, contentId);
    if (!pinCache.has(key)) {
      // Fire-and-forget read; will trigger re-render via emitChange.
      void readPinState(userId, contentType, contentId).then((pinned) => {
        pinCache.set(key, pinned);
        emitChange();
      });
    }
  }

  return { isPinned: offlineAllowed ? isPinned : false, toggle };
}

// ── Cache ──────────────────────────────────────────────────────────

/** Module-level pin state cache for synchronous snapshot reads. */
const pinCache = new Map<string, boolean>();

function cacheKey(userId: string | undefined, contentType: string, contentId: string): string {
  return `${userId ?? ''}:${contentType}:${contentId}`;
}
