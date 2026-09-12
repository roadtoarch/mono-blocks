/**
 * Hook to access the Service Worker update state.
 *
 * Returns `{ isUpdateAvailable, applyUpdate }` from the nearest
 * {@link SwUpdateProvider}. Throws if used outside a provider.
 *
 * @module components/connectivity/use-sw-update
 */

import { use } from 'react';

import { SwUpdateContext } from './sw-update-context';

/**
 * Returns the SW update state from the nearest provider.
 *
 * @throws If called outside a {@link SwUpdateProvider}.
 */
export function useSwUpdate() {
  const ctx = use(SwUpdateContext);
  if (ctx === undefined) {
    throw new Error('useSwUpdate must be used within a SwUpdateProvider');
  }
  return ctx;
}
