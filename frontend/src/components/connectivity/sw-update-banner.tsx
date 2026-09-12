/**
 * Banner that prompts the user to refresh when a new Service Worker
 * version is available.
 *
 * Uses Carbon `InlineNotification` with `role="status"` and auto-focus
 * on appearance for accessibility.
 *
 * @module components/connectivity/sw-update-banner
 */

import { ActionableNotification } from '@carbon/react';
import { useCallback, useRef, useEffect } from 'react';

import { useSwUpdate } from './use-sw-update';

/**
 * Displays a non-intrusive notification when a new SW version is
 * waiting to activate, with a "Refresh" action button.
 */
const SwUpdateBanner = () => {
  const { isUpdateAvailable, applyUpdate } = useSwUpdate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleRefresh = useCallback(() => {
    applyUpdate();
  }, [applyUpdate]);

  // Auto-focus the notification wrapper when it appears for accessibility.
  useEffect(() => {
    if (isUpdateAvailable && wrapperRef.current) {
      wrapperRef.current.focus();
    }
  }, [isUpdateAvailable]);

  if (!isUpdateAvailable) {
    return null;
  }

  return (
    <div aria-live="polite" ref={wrapperRef} role="status" tabIndex={-1}>
      <ActionableNotification
        kind="info"
        lowContrast
        subtitle="A new version is available. Refresh to update."
        title="Update available"
        actionButtonLabel="Refresh"
        onActionButtonClick={handleRefresh}
      />
    </div>
  );
};

export { SwUpdateBanner };
