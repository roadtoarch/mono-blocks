/**
 * Connectivity context provider for the offline UI layer.
 *
 * Subscribes to `navigator.onLine` and the browser `online`/`offline`
 * events to keep a React context in sync with the real connectivity
 * state. Also polls the outbox adapter for the pending mutation count
 * so that the UI can surface the outbox badge without importing Dexie.
 *
 * @module components/connectivity/connectivity-provider
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ConnectivityContext } from './connectivity-context';

import type { FC, ReactNode } from 'react';

import { outboxAdapter } from '@/db/outbox-adapter';

// ── Polling interval ────────────────────────────────────────────────

/**
 * How often (ms) to poll the outbox adapter for the pending count.
 *
 * Kept short so the badge updates promptly when the sync engine
 * drains mutations or new mutations are queued offline.
 */
const OUTBOX_POLL_INTERVAL_MS = 2_000;

// ── Provider ────────────────────────────────────────────────────────

interface ConnectivityProviderProps {
  readonly children: ReactNode;
}

/**
 * Provides {@link ConnectivityState} to the component tree.
 *
 * Call once near the root of the app (inside the auth boundary but
 * outside the router so the banner and outbox indicator are always
 * mounted).
 *
 * @example
 * ```tsx
 * <ConnectivityProvider>
 *   <RouterProvider router={router} />
 * </ConnectivityProvider>
 * ```
 */
export const ConnectivityProvider: FC<ConnectivityProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  // ── navigator.onLine + browser events ───────────────────────────
  useEffect(() => {
    const goOnline = (): void => {
      setIsOnline(true);
    };
    const goOffline = (): void => {
      setIsOnline(false);
    };

    globalThis.addEventListener('online', goOnline);
    globalThis.addEventListener('offline', goOffline);

    return () => {
      globalThis.removeEventListener('online', goOnline);
      globalThis.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Outbox pending count polling ────────────────────────────────
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const refreshCount = useCallback(async () => {
    try {
      const [pending, failed] = await Promise.all([
        outboxAdapter.count(),
        outboxAdapter.failedCount(),
      ]);
      setPendingCount(pending);
      setFailedCount(failed);
    } catch {
      // Dexie may reject if the database is closing or not yet open.
      // Silently ignore — the next poll will retry.
    }
  }, []);

  useEffect(() => {
    // Initial fetch — scheduled outside the effect body via
    // queueMicrotask to avoid the set-state-in-effect lint warning.
    queueMicrotask(() => {
      void refreshCount();
    });

    intervalRef.current = setInterval(() => {
      void refreshCount();
    }, OUTBOX_POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== undefined) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshCount]);

  // ── Context value (memoised to avoid unnecessary re-renders) ────
  const value = useMemo(
    () => ({ isOnline, pendingCount, failedCount }),
    [isOnline, pendingCount, failedCount],
  );

  return <ConnectivityContext value={value}>{children}</ConnectivityContext>;
};
