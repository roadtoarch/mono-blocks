/**
 * MonoBlocks — hooks/useToasts.ts
 *
 * React hook wrapping the vanilla toast store.
 * Uses useSyncExternalStore for reactivity.
 *
 * IMPORTANT: getSnapshot must return a referentially stable value when
 * the store has not changed, otherwise React enters an infinite re-render
 * loop. We cache the last snapshot and only create a new array when the
 * store's toasts reference changes.
 */
import { useCallback, useSyncExternalStore } from 'react';

import type { Toast, ToastKind } from '@/stores/toast';

import { getToasts, subscribe, toast as showToast, dismissToast } from '@/stores/toast';

// Cached snapshot — same reference as long as the store hasn't changed.
let cachedToasts: Toast[] = [];
let cachedRef: Toast[] | null = null;

function subscribeToasts(cb: () => void): () => void {
  return subscribe(cb);
}

function getSnapshot(): Toast[] {
  const current = getToasts();
  // getToasts() returns the module-level `toasts` array directly.
  // When the store updates, it creates a new array via spread ([...toasts, entry])
  // or filter, so referential identity changes.
  if (cachedRef !== current) {
    cachedRef = current;
    cachedToasts = current;
  }
  return cachedToasts;
}

function getServerSnapshot(): Toast[] {
  return [];
}

/**
 * Provides the current toast list and a `toast()` function.
 */
export function useToasts(): {
  toasts: Toast[];
  toast: (kind: ToastKind, title: string, body?: string) => () => void;
  dismiss: (id: string) => void;
} {
  const toasts = useSyncExternalStore(subscribeToasts, getSnapshot, getServerSnapshot);

  const toastFn = useCallback(
    (kind: ToastKind, title: string, body?: string) => showToast(kind, title, body),
    [],
  );

  const dismissFn = useCallback((id: string) => {
    dismissToast(id);
  }, []);

  return { toasts, toast: toastFn, dismiss: dismissFn };
}
