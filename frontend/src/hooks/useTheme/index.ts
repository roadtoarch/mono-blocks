/**
 * MonoBlocks — hooks/useTheme.ts
 *
 * React hook wrapping the vanilla theme/skin store.
 * Uses useSyncExternalStore for zero-dependency reactivity.
 */
import { useCallback, useSyncExternalStore } from 'react';

import type { CarbonTheme, Skin } from '@/stores/theme';

import {
  getSkin,
  getTheme,
  setSkin as applySkin,
  setTheme as applyTheme,
  toggleTheme as toggleThemeFn,
} from '@/stores/theme';

/** Subscribe to theme attribute changes on <html>. */
function subscribe(cb: () => void): () => void {
  const observer = new MutationObserver(() => {
    cb();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-carbon-theme', 'data-mb-skin'],
  });
  return () => {
    observer.disconnect();
  };
}

/** Read current snapshot. */
function getSnapshot(): string {
  const theme = document.documentElement.getAttribute('data-carbon-theme') ?? 'white';
  const skin = document.documentElement.getAttribute('data-mb-skin') ?? 'cornerstone';
  return `${theme}:${skin}`;
}

function getServerSnapshot(): string {
  return 'white:cornerstone';
}

/**
 * Provides the current Carbon theme and skin, plus setters.
 */
export const useTheme = (): {
  theme: CarbonTheme;
  skin: Skin;
  setTheme: (t: CarbonTheme) => void;
  toggleTheme: () => CarbonTheme;
  setSkin: (s: Skin) => void;
} => {
  // Subscribe to attribute mutations so React re-renders on change.
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const theme = getTheme();
  const skin = getSkin();
  const setTheme = useCallback((t: CarbonTheme) => {
    applyTheme(t);
  }, []);
  const toggleTheme = useCallback(() => toggleThemeFn(), []);
  const setSkin = useCallback((s: Skin) => {
    applySkin(s);
  }, []);
  return { theme, skin, setTheme, toggleTheme, setSkin };
};
