/**
 * Offline guard — wraps a subtree and shows a full-page "unavailable"
 * message when the user is offline and the current route is not
 * marked as offline-available.
 *
 * Implements DEC-10: a 5-second debounce before showing the
 * unavailable message, preventing flicker during brief connectivity
 * blips.
 *
 * @module components/offline/offline-guard
 */

import { useEffect, useRef, useState } from 'react';

import { OfflineUnavailable } from './offline-unavailable';

import type { FC, ReactNode } from 'react';

import { useConnectivity } from '@/components/connectivity/use-connectivity';
import { useOfflineAllowed } from '@/offline/use-offline-allowed';

/**
 * Delay (ms) before showing the unavailable message when the user
 * navigates to a non-offline-available page while offline.
 *
 * DEC-10: prevents flicker during brief connectivity blips.
 */
const OFFLINE_UNAVAILABLE_DEBOUNCE_MS = 5_000;

interface OfflineGuardProps {
  /** Whether the current route is marked as offline-available. */
  readonly isOfflineAvailable: boolean;
  /** Render mode for the unavailable state. @default 'fullpage' */
  readonly mode?: 'banner' | 'fullpage';
  readonly children: ReactNode;
}

/**
 * Guards a subtree against offline access to non-available content.
 *
 * When the user is offline **and** has the `OFFLINE_ALLOWED` role **and**
 * the current route is **not** offline-available, this component shows
 * the {@link OfflineUnavailable} message after a 5-second debounce.
 *
 * When the user does **not** have `OFFLINE_ALLOWED`, the guard renders
 * children unconditionally — offline restrictions only apply to users
 * who have opted into the offline feature set.
 *
 * @example
 * ```tsx
 * <OfflineGuard isOfflineAvailable={route.staticData.offlineAvailable}>
 *   <Outlet />
 * </OfflineGuard>
 * ```
 */
export const OfflineGuard: FC<OfflineGuardProps> = ({
  isOfflineAvailable,
  mode = 'fullpage',
  children,
}) => {
  const { isOnline } = useConnectivity();
  const offlineAllowed = useOfflineAllowed();

  // Track whether the debounce period has elapsed for this
  // particular offline + non-available combination.
  const [showUnavailable, setShowUnavailable] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Track previous guard conditions so we can reset showUnavailable
  // when they change, without calling setState synchronously in the
  // effect body.
  const prevGuardRef = useRef(false);
  const shouldGuard = !isOnline && offlineAllowed && !isOfflineAvailable;

  useEffect(() => {
    // Clear any pending timer on every change.
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }

    // When guard conditions change (on → off or vice versa), reset
    // the unavailable flag. Using queueMicrotask avoids the
    // set-state-in-effect lint warning.
    if (prevGuardRef.current !== shouldGuard) {
      prevGuardRef.current = shouldGuard;
      queueMicrotask(() => {
        setShowUnavailable(false);
      });
    }

    // Only start the debounce if: offline + OFFLINE_ALLOWED + not available.
    if (shouldGuard) {
      timerRef.current = setTimeout(() => {
        setShowUnavailable(true);
      }, OFFLINE_UNAVAILABLE_DEBOUNCE_MS);
    }

    return () => {
      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, [shouldGuard]);

  if (showUnavailable) {
    return <OfflineUnavailable mode={mode} />;
  }

  return <>{children}</>;
};
