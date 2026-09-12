/**
 * Hook that exposes the current connectivity state from the nearest
 * {@link ConnectivityProvider}.
 *
 * @module components/connectivity/use-connectivity
 */

import { use } from 'react';

import { ConnectivityContext } from './connectivity-context';

import type { ConnectivityState } from './connectivity-context';

/**
 * Returns the current {@link ConnectivityState} from the nearest
 * {@link ConnectivityProvider}.
 *
 * Throws if no provider is mounted — this is intentional: connectivity
 * state is required by all offline UI and a missing provider is a
 * programming error, not a runtime condition.
 */
export function useConnectivity(): ConnectivityState {
  const ctx = use(ConnectivityContext);
  if (ctx === undefined) {
    throw new Error(
      'useConnectivity must be used within a <ConnectivityProvider>. ' +
        'Wrap your app (or the authenticated subtree) with <ConnectivityProvider>.',
    );
  }
  return ctx;
}
