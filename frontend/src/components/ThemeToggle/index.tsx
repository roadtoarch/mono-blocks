import { Moon, Sun } from '@carbon/icons-react';
import { IconButton } from '@carbon/react';
import { useCallback, useSyncExternalStore } from 'react';

/** localStorage key used to persist the user's colour-mode preference. */
const THEME_STORAGE_KEY = 'theme-preference';

/** Possible values for the `data-theme` attribute on `<html>`. */
type Theme = 'light' | 'dark';

/**
 * Reads the current theme from `document.documentElement.dataset.theme`,
 * falling back to `'light'` when no value has been set.
 */
const getTheme = (): Theme => {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
};

/**
 * Applies the given theme by setting `data-theme` on `<html>` and
 * persisting the choice to {@link THEME_STORAGE_KEY}.
 */
const applyTheme = (theme: Theme): void => {
  document.documentElement.dataset.theme = theme;
  try {
    globalThis.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* localStorage may be unavailable (private browsing, quota). Ignore. */
  }
};

/* ------------------------------------------------------------------ */
/* Minimal external store for theme state, compatible with React 19's  */
/* `useSyncExternalStore`. This avoids an `useState` + `useEffect`     */
/* combination and keeps the store trivially testable.                 */
/* ------------------------------------------------------------------ */

type Listener = () => void;

const listeners = new Set<Listener>();

const subscribe = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = (): Theme => {
  return getTheme();
};

const setTheme = (theme: Theme): void => {
  if (theme === getTheme()) return;
  applyTheme(theme);
  listeners.forEach((fn) => {
    fn();
  });
};

/**
 * Toggle button that switches between light and dark colour modes.
 *
 * The current mode is read from `document.documentElement.dataset.theme`
 * and persisted to `localStorage` under the key `"theme-preference"`.
 * A blocking inline `<script>` in `index.html` restores the saved
 * preference before the first paint, so the component always renders
 * with the correct theme from the start.
 *
 * Uses Carbon's {@link IconButton} with `Sun` / `Moon` icons for a
 * consistent look in the application header.
 */
export const ThemeToggle = (): React.ReactElement => {
  const theme = useSyncExternalStore(subscribe, getSnapshot);

  const handleToggle = useCallback(() => {
    setTheme(getTheme() === 'light' ? 'dark' : 'light');
  }, []);

  const isDark = theme === 'dark';

  return (
    <IconButton
      label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      kind="ghost"
      onClick={handleToggle}
      size="lg"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </IconButton>
  );
};
