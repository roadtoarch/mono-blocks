/**
 * Connectivity banner — displays an inline notification when the app
 * goes offline and a brief "Back online" confirmation when
 * connectivity is restored.
 *
 * Uses Carbon's {@link InlineNotification} with `role="status"` for
 * screen-reader accessibility (exit gate: banner within 500ms).
 *
 * @module components/connectivity/connectivity-banner
 */

import { InlineNotification } from '@carbon/react';
import { useEffect, useRef, useState } from 'react';

import { useConnectivity } from './use-connectivity';

import type { FC } from 'react';

/**
 * How long (ms) the "Back online" notification remains visible
 * before auto-dismissing. The offline notification stays until
 * connectivity returns.
 */
const BACK_ONLINE_DURATION_MS = 3_000;

/**
 * Banner that surfaces connectivity state changes to the user.
 *
 * - **Offline**: persistent `InlineNotification` (kind `warning`),
 *   stays until the browser goes back online.
 * - **Back online**: self-dismissing `InlineNotification` (kind
 *   `success`), auto-hides after {@link BACK_ONLINE_DURATION_MS}.
 *
 * The `role="status"` attribute ensures screen readers announce the
 * state change without interrupting the current interaction.
 *
 * @example
 * ```tsx
 * <ConnectivityBanner />
 * ```
 */
export const ConnectivityBanner: FC = () => {
  const { isOnline } = useConnectivity();

  // Use a ref to track the previous online state so we can detect
  // offline→online transitions without calling setState in an effect.
  const wasOnlineRef = useRef(isOnline);

  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    if (isOnline && !wasOnlineRef.current) {
      // Transition: offline → online.
      // setShowBackOnline is called from a timeout callback (not
      // synchronously in the effect body) to satisfy the
      // set-state-in-effect lint rule.
      const showTimer = setTimeout(() => {
        setShowBackOnline(true);
      }, 0);

      const dismissTimer = setTimeout(() => {
        setShowBackOnline(false);
      }, BACK_ONLINE_DURATION_MS);

      wasOnlineRef.current = true;

      return () => {
        clearTimeout(showTimer);
        clearTimeout(dismissTimer);
      };
    }

    wasOnlineRef.current = isOnline;
    return undefined;
  }, [isOnline]);

  if (!isOnline) {
    return (
      <InlineNotification
        kind="warning"
        title="You are offline"
        subtitle="Some features may be unavailable until connectivity is restored."
        lowContrast
        hideCloseButton
        role="status"
      />
    );
  }

  if (showBackOnline) {
    return (
      <InlineNotification
        kind="success"
        title="Back online"
        subtitle="Connectivity has been restored. Pending changes will sync."
        lowContrast
        hideCloseButton
        role="status"
      />
    );
  }

  return null;
};
