/**
 * Hook that reports storage budget status for the offline pin system.
 *
 * Uses `navigator.storage.estimate()` to determine how much of the
 * browser's storage quota the app is consuming, and returns flags
 * matching the Phase 6 enforcement thresholds:
 *
 * - **≥80%**: `isWarning` is `true` — surface a warning notification.
 * - **≥90%**: `canPin` is `false` — prevent new pins (unpin is still allowed).
 *
 * @module offline/use-storage-budget
 */

import { useEffect, useState } from 'react';

// ── Thresholds ──────────────────────────────────────────────────────

/** Usage percentage at which a warning notification should appear. */
const WARNING_THRESHOLD = 80;

/** Usage percentage at which new pins must be blocked. */
const CRITICAL_THRESHOLD = 90;

// ── Polling ─────────────────────────────────────────────────────────

/**
 * How often (ms) to refresh the storage estimate.
 *
 * Reuses the same 30-second interval as {@link StorageIndicator}
 * since storage changes slowly.
 */
const STORAGE_POLL_INTERVAL_MS = 30_000;

// ── Types ───────────────────────────────────────────────────────────

interface StorageBudgetState {
  /** Whether the app is using less than 90% of the quota — new pins allowed. */
  readonly canPin: boolean;
  /** Whether the app is at or above 80% usage — surface a warning. */
  readonly isWarning: boolean;
  /** Current usage as a percentage of quota (0–100). `0` if quota is unavailable. */
  readonly usagePercent: number;
}

// ── Helpers ─────────────────────────────────────────────────────────

const getStorageEstimate = async (): Promise<{ quota: number; usage: number }> => {
  try {
    if (!('storage' in navigator) || typeof navigator.storage.estimate !== 'function') {
      return { quota: 0, usage: 0 };
    }
    const { quota = 0, usage = 0 } = await navigator.storage.estimate();
    return { quota, usage };
  } catch {
    return { quota: 0, usage: 0 };
  }
};

// ── Hook ────────────────────────────────────────────────────────────

/**
 * Returns the current storage budget status.
 *
 * Polls `navigator.storage.estimate()` every 30 seconds. Returns
 * conservative defaults (`canPin: true`, `isWarning: false`) when
 * the Storage API is unavailable — we don't want to block pinning
 * just because the browser doesn't report quota.
 *
 * @example
 * ```tsx
 * const { canPin, isWarning, usagePercent } = useStorageBudget();
 * if (!canPin) return <Tooltip label="Storage is full — unpin records first"><PinButton … disabled /></Tooltip>;
 * ```
 */
export function useStorageBudget(): StorageBudgetState {
  const [usagePercent, setUsagePercent] = useState(0);

  useEffect(() => {
    void getStorageEstimate().then(({ quota, usage }) => {
      setUsagePercent(quota > 0 ? Math.round((usage / quota) * 100) : 0);
    });

    const id = setInterval(() => {
      void getStorageEstimate().then(({ quota, usage }) => {
        setUsagePercent(quota > 0 ? Math.round((usage / quota) * 100) : 0);
      });
    }, STORAGE_POLL_INTERVAL_MS);

    return () => {
      clearInterval(id);
    };
  }, []);

  // When quota is 0 (API unavailable), default to allowing pins.
  const canPin = usagePercent === 0 || usagePercent < CRITICAL_THRESHOLD;
  const isWarning = usagePercent >= WARNING_THRESHOLD;

  return { canPin, isWarning, usagePercent };
}
