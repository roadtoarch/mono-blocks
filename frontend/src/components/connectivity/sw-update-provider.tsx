/**
 * Provider that detects Service Worker updates and exposes them via context.
 *
 * Listens for `updatefound` on the SW registration and `statechange` on
 * the installing worker. When the new worker reaches the `installed` (waiting)
 * state, `isUpdateAvailable` becomes `true`.
 *
 * The `applyUpdate` callback sends `postMessage({ type: 'SKIP_WAITING' })`
 * to the waiting SW, which triggers `skipWaiting` → `controllerchange` →
 * page reload.
 *
 * Requires the app to register its SW *before* mounting this provider so
 * that the registration object is available. If no SW registration exists
 * (e.g. dev mode without `VITE_ENABLE_SW`), the provider is a no-op pass-through.
 *
 * @module components/connectivity/sw-update-provider
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { SwUpdateContext } from './sw-update-context';

import type { ReactNode } from 'react';

/** Message sent to the waiting SW to trigger `skipWaiting`. */
const SKIP_WAITING_MESSAGE = { type: 'SKIP_WAITING' } as const;

/**
 * Detects and exposes Service Worker updates to the React tree.
 *
 * @param props.children — Child components.
 */
const SwUpdateProvider = ({ children }: { readonly children: ReactNode }) => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Discover the current SW registration on mount.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    void navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      registrationRef.current = reg;

      // If a worker is already waiting (e.g. page opened after SW updated),
      // surface the update immediately.
      if (reg.waiting) {
        waitingWorkerRef.current = reg.waiting;
        setIsUpdateAvailable(true);
      }
    });
  }, []);

  // Listen for new SW installations on the registration.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const onUpdateFound = (): void => {
      const reg = registrationRef.current;
      if (!reg?.installing) return;

      const installingWorker = reg.installing;

      const onStateChange = (): void => {
        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New SW installed and waiting. Old SW still controls the page.
          waitingWorkerRef.current = installingWorker;
          setIsUpdateAvailable(true);
        }
      };

      installingWorker.addEventListener('statechange', onStateChange);
    };

    const reg = registrationRef.current;
    if (reg) {
      reg.addEventListener('updatefound', onUpdateFound);
    }

    return () => {
      if (reg) {
        reg.removeEventListener('updatefound', onUpdateFound);
      }
    };
  }, []);

  // Reload the page when the new SW takes control.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const onControllerChange = (): void => {
      globalThis.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    const worker = waitingWorkerRef.current;
    if (worker) {
      worker.postMessage(SKIP_WAITING_MESSAGE);
    }
  }, []);

  return <SwUpdateContext value={{ isUpdateAvailable, applyUpdate }}>{children}</SwUpdateContext>;
};

export { SwUpdateProvider };
