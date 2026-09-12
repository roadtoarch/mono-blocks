/**
 * React context for Service Worker update state.
 *
 * Exposes whether a new SW version is waiting to activate and a
 * callback to trigger activation (which reloads the page).
 *
 * @module components/connectivity/sw-update-context
 */

import { createContext } from 'react';

/** State exposed by the SW update provider. */
export interface SwUpdateState {
  /** `true` when a new Service Worker has installed and is waiting. */
  isUpdateAvailable: boolean;
  /**
   * Sends `skipWaiting` to the waiting SW, which will cause it to
   * activate and take control. The page reloads automatically via
   * the `controllerchange` listener.
   */
  applyUpdate: () => void;
}

/**
 * Context for SW update state.
 *
 * `undefined` default enforces the provider guard pattern — consumers
 * must call {@link useSwUpdate} which throws if the provider is missing.
 */
export const SwUpdateContext = createContext<SwUpdateState | undefined>(undefined);
