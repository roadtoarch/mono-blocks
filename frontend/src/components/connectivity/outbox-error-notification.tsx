/**
 * Notification that surfaces permanently failed outbox mutations.
 *
 * Shown when mutations have exceeded the maximum retry count (6.3).
 * Uses Carbon `InlineNotification` with `role="alert"` for urgency.
 * Only visible to users with the `OFFLINE_ALLOWED` role.
 *
 * @module components/connectivity/outbox-error-notification
 */

import { InlineNotification } from '@carbon/react';

import { useConnectivity } from './use-connectivity';

import { useOfflineAllowed } from '@/offline/use-offline-allowed';

/**
 * Displays an error notification when outbox mutations have
 * permanently failed after maximum retry attempts.
 */
const OutboxErrorNotification = () => {
  const offlineAllowed = useOfflineAllowed();
  const { failedCount } = useConnectivity();

  if (!offlineAllowed || failedCount === 0) {
    return null;
  }

  const label = failedCount === 1 ? '1 change' : `${String(failedCount)} changes`;

  return (
    <InlineNotification
      kind="error"
      lowContrast
      role="alert"
      subtitle={`${label} could not be saved. Check your connection and try again.`}
      title="Sync failed"
    />
  );
};

export { OutboxErrorNotification };
