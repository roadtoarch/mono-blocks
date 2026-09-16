/**
 * MonoBlocks — hooks/useNav.ts
 *
 * React hook wrapping the vanilla nav store.
 * Observes the `data-nav` attribute on `.mb-app` to stay in sync.
 * Now that stores/nav.ts updates the DOM attribute directly (like
 * stores/theme.ts), the MutationObserver fires on toggle and the
 * hook re-renders correctly.
 */
import { useCallback, useSyncExternalStore } from 'react';

import type { NavState } from '@/stores/nav';

import { setNavState as applyNavState, toggleNav as toggleNavFn } from '@/stores/nav';

let appEl: HTMLElement | null = null;

function getAppEl(): HTMLElement | null {
  appEl ??= document.querySelector('.mb-app');
  return appEl;
}

/** Subscribe to data-nav attribute changes on .mb-app. */
function subscribe(cb: () => void): () => void {
  const el = getAppEl();
  if (!el) {
    // Element not mounted yet — return no-op.
    return () => undefined;
  }
  const observer = new MutationObserver(() => {
    cb();
  });
  observer.observe(el, {
    attributes: true,
    attributeFilter: ['data-nav'],
  });
  return () => {
    observer.disconnect();
  };
}

function getSnapshot(): NavState {
  const el = getAppEl();
  const attr = el?.getAttribute('data-nav');
  return attr === 'open' || attr === 'closed' ? attr : 'closed';
}

function getServerSnapshot(): NavState {
  return 'closed';
}

/**
 * Provides the current nav state and toggle/set functions.
 */
export function useNav(): {
  navState: NavState;
  isOpen: boolean;
  setNavState: (s: NavState) => void;
  toggleNav: () => void;
} {
  const navState = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isOpen = navState === 'open';

  const setNavState = useCallback((s: NavState) => {
    applyNavState(s);
  }, []);

  const toggleNav = useCallback(() => {
    toggleNavFn();
  }, []);

  return { navState, isOpen, setNavState, toggleNav };
}
