/**
 * Connectivity context — React context for offline UI state.
 *
 * Exported separately from the provider component so that
 * `react-refresh/only-export-components` remains satisfied in the
 * provider module.
 *
 * @module components/connectivity/connectivity-context
 */

import { createContext } from 'react';

/**
 * Connectivity state consumed by `useConnectivity` and dependent
 * components (banner, outbox indicator, offline guard).
 */
export interface ConnectivityState {
  /** Whether the browser reports an active network connection. */
  readonly isOnline: boolean;
  /** Number of pending mutations in the outbox (queued for replay). */
  readonly pendingCount: number;
  /** Number of permanently failed mutations (exceeded max retries). */
  readonly failedCount: number;
}

/**
 * React context for connectivity state.
 *
 * `undefined` default forces consumers through the `useConnectivity`
 * guard hook, which throws if no provider is mounted.
 */
export const ConnectivityContext = createContext<ConnectivityState | undefined>(undefined);
