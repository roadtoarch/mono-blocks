/**
 * MonoBlocks — stores/theme.ts
 *
 * Theme and skin persistence store. Reads/writes localStorage,
 * applies data attributes to <html>.
 */

const THEME_KEY = 'mb-theme';
const SKIN_KEY = 'mb-skin';

export type CarbonTheme = 'white' | 'g100';
export type Skin = 'cornerstone' | 'mono' | 'ember';

/**
 * Read the persisted theme from localStorage, defaulting to system preference.
 */
export const getTheme = (): CarbonTheme => {
  try {
    const stored = globalThis.localStorage.getItem(THEME_KEY);
    if (stored === 'g100' || stored === 'white') return stored;
  } catch {
    // storage unavailable
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'g100' : 'white';
};

/**
 * Apply a theme and persist it.
 */
export const setTheme = (theme: CarbonTheme): void => {
  document.documentElement.setAttribute('data-carbon-theme', theme);
  try {
    globalThis.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // storage unavailable — theme still applies for this session
  }
};

/**
 * Toggle between light and dark themes.
 */
export const toggleTheme = (): CarbonTheme => {
  const next = getTheme() === 'g100' ? 'white' : 'g100';
  setTheme(next);
  return next;
};

/**
 * Read the persisted skin from localStorage.
 */
export const getSkin = (): Skin => {
  try {
    const stored = globalThis.localStorage.getItem(SKIN_KEY);
    if (stored === 'cornerstone' || stored === 'mono' || stored === 'ember') return stored;
  } catch {
    // storage unavailable
  }
  return 'cornerstone';
};

/**
 * Apply a skin and persist it.
 */
export const setSkin = (skin: Skin): void => {
  document.documentElement.setAttribute('data-mb-skin', skin);
  try {
    globalThis.localStorage.setItem(SKIN_KEY, skin);
  } catch {
    // storage unavailable
  }
};
