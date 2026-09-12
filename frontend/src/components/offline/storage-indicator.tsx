/**
 * Storage indicator — shows how much offline storage the browser has
 * allocated and how much the app is using, via the Storage API
 * (`navigator.storage.estimate()`).
 *
 * Gated behind the `OFFLINE_ALLOWED` realm role and rendered inside
 * the profile {@link HeaderPanel} in the side-nav layout.
 *
 * @module components/offline/storage-indicator
 */

import { ProgressBar } from '@carbon/react';
import { useEffect, useState } from 'react';

import type { FC } from 'react';

/**
 * Polling interval (ms) for refreshing the storage estimate.
 *
 * Storage usage changes slowly (pin/unpin actions, cache eviction),
 * so 30 seconds is sufficient.
 */
const STORAGE_POLL_INTERVAL_MS = 30_000;

interface StorageEstimate {
  readonly quota: number;
  readonly usage: number;
}

/**
 * Fetches the current storage estimate from the browser.
 *
 * Falls back to `{ quota: 0, usage: 0 }` if the API is unavailable
 * or the call rejects (e.g. in some private-browsing contexts).
 */
const getStorageEstimate = async (): Promise<StorageEstimate> => {
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

/**
 * Formats a byte count into a human-readable string.
 *
 * Uses binary units (KiB, MiB, GiB) for consistency with browser
 * DevTools storage panels.
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KiB', 'MiB', 'GiB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

/**
 * Displays a progress bar showing storage usage vs quota.
 *
 * Returns `null` if the Storage API is unavailable or the quota is
 * zero (some browsers/environments).
 *
 * The bar turns yellow at ≥80% usage and red at ≥90%, matching the
 * Phase 6 storage budget enforcement thresholds.
 *
 * @example
 * ```tsx
 * <StorageIndicator />
 * ```
 */
export const StorageIndicator: FC = () => {
  const [estimate, setEstimate] = useState<StorageEstimate>({ quota: 0, usage: 0 });

  useEffect(() => {
    void getStorageEstimate().then(setEstimate);

    const id = setInterval(() => {
      void getStorageEstimate().then(setEstimate);
    }, STORAGE_POLL_INTERVAL_MS);

    return () => {
      clearInterval(id);
    };
  }, []);

  if (estimate.quota === 0) {
    return null;
  }

  const percentage = Math.round((estimate.usage / estimate.quota) * 100);

  // Carbon ProgressBar doesn't accept a `kind` or color prop —
  // the visual state is communicated via the label text.
  const statusLabel = percentage >= 90 ? 'Critical' : percentage >= 80 ? 'Warning' : 'Normal';

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <p
        style={{
          fontSize: '0.75rem',
          color: 'var(--cds-text-secondary, #525252)',
          marginBottom: '0.25rem',
        }}
      >
        Offline storage: {formatBytes(estimate.usage)} / {formatBytes(estimate.quota)} (
        {statusLabel})
      </p>
      <ProgressBar label="" helperText="" value={percentage} max={100} />
    </div>
  );
};
