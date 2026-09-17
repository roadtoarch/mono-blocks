/**
 * MonoBlocks — stores/nav.ts
 *
 * Navigation state persistence. Push-style sidenav: open or closed.
 * Mirrors the theme store pattern: writes BOTH localStorage and the
 * DOM data-nav attribute on .mb-app so that MutationObserver-based
 * hooks detect the change immediately.
 */

const NAV_KEY = 'mb-nav';

export type NavState = 'open' | 'closed';

/** Lazy reference to the .mb-app element. */
let appEl: HTMLElement | null = null;

function getAppEl(): HTMLElement | null {
  appEl ??= document.querySelector('.mb-app');
  return appEl;
}

/**
 * Read the persisted nav state from localStorage.
 */
export const getNavState = (): NavState => {
  // Prefer the live DOM attribute (source of truth for the hook).
  const el = getAppEl();
  if (el) {
    const attr = el.getAttribute('data-nav');
    if (attr === 'open' || attr === 'closed') return attr;
  }
  try {
    const stored = globalThis.localStorage.getItem(NAV_KEY);
    if (stored === 'open' || stored === 'closed') return stored;
  } catch {
    // storage unavailable
  }
  return 'closed';
};

/**
 * Apply the nav state: update the DOM attribute AND persist to localStorage.
 */
export const setNavState = (state: NavState): void => {
  const el = getAppEl();
  if (el) {
    el.setAttribute('data-nav', state);
  }
  try {
    globalThis.localStorage.setItem(NAV_KEY, state);
  } catch {
    // storage unavailable — state still applies for this session
  }
};

/**
 * Toggle the nav state.
 */
export const toggleNav = (): NavState => {
  const next = getNavState() === 'open' ? 'closed' : 'open';
  setNavState(next);
  return next;
};
