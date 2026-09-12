/**
 * Storage warning notification — alerts the user when offline storage
 * usage reaches the warning threshold (≥80%) or the critical threshold
 * (≥90%).
 *
 * Gated behind the `OFFLINE_ALLOWED` realm role. Rendered in the
 * authenticated layout alongside the connectivity banner.
 *
 * @module components/offline/storage-warning
 */

import { InlineNotification } from '@carbon/react';

import type { FC } from 'react';

import { useOfflineAllowed } from '@/offline/use-offline-allowed';
import { useStorageBudget } from '@/offline/use-storage-budget';

/**
 * Displays a warning when storage usage is ≥80% and a critical alert
 * when usage is ≥90%.
 *
 * Returns `null` when:
 * - The user does not have the `OFFLINE_ALLOWED` role, or
 * - Storage usage is below the warning threshold.
 *
 * @example
 * ```tsx
 * <StorageWarning />
 * ```
 */
export const StorageWarning: FC = () => {
  const offlineAllowed = useOfflineAllowed();
  const { isWarning, canPin, usagePercent } = useStorageBudget();

  if (!offlineAllowed || !isWarning) {
    return null;
  }

  if (!canPin) {
    return (
      <InlineNotification
        kind="error"
        title="Storage is nearly full"
        subtitle={`Offline storage is at ${String(usagePercent)}% capacity. Unpin records to free space. New pins are disabled.`}
        role="alert"
        lowContrast
        hideCloseButton
      />
    );
  }

  return (
    <InlineNotification
      kind="warning"
      title="Offline storage is filling up"
      subtitle={`Storage is at ${String(usagePercent)}% capacity. Consider unpinning records you no longer need offline.`}
      role="status"
      lowContrast
      hideCloseButton
    />
  );
};
