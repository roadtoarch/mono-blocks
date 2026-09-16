/**
 * MonoBlocks — components/AppShell.tsx
 *
 * App chrome: fixed 48px header, push-style side nav, main content area.
 * Always-dark shell chrome (shell-bg tokens are constant across themes).
 * Uses useTheme, useNav hooks for reactive state.
 */
import { Close, ColorPalette, Menu, Moon, Reset, Sun } from '@carbon/icons-react';
import { Link, Outlet, useLocation, useRouter } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { NavItem } from '@/schema/config';
import type { Skin } from '@/stores/theme';

import * as mockDb from '@/api/mockDb'; // mock-only: reset() has no REST equivalent yet
import { ToastRegion } from '@/components/ToastRegion';
import { useNav, useTheme } from '@/hooks';
import { navItems } from '@/schema/config';
import { toast } from '@/stores/toast';

/**
 * Monogram SVG used in the header. Matches the landing monogram:
 * 3 stacked rects — 2 currentColor, 1 brand accent.
 */
function Monogram({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="mb-icon"
    >
      <rect x="2" y="2" width="16" height="4" fill="currentColor" />
      <rect x="2" y="8" width="16" height="4" fill="var(--cds-button-primary)" />
      <rect x="2" y="14" width="16" height="4" fill="currentColor" />
    </svg>
  );
}

/**
 * Side navigation item.
 */
function SidenavItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      to={item.path}
      className={`mb-sidenav__item${isActive ? ' is-active' : ''}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="mb-sidenav__icon" aria-hidden="true">
        {item.icon}
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

/**
 * Skin chip for the header dropdown.
 */
function SkinChip({
  skin,
  currentSkin,
  onSelect,
}: {
  skin: Skin;
  currentSkin: Skin;
  onSelect: (s: Skin) => void;
}) {
  const label = skin.charAt(0).toUpperCase() + skin.slice(1);
  const isSelected = skin === currentSkin;

  return (
    <button
      type="button"
      className={`mb-skin-chip${isSelected ? ' is-selected' : ''}`}
      data-skin={skin}
      onClick={() => {
        onSelect(skin);
      }}
      aria-pressed={isSelected}
    >
      <span className="mb-skin-chip__swatch" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

const SKINS: Skin[] = ['cornerstone', 'mono', 'ember'];

/** No-op function for click-outside handler subscription. */
function swallow(): void {
  return undefined;
}

/**
 * Full application shell with header, side nav, main content, and toast region.
 */
export function AppShell() {
  const { theme, skin, toggleTheme, setSkin } = useTheme();
  const { isOpen, toggleNav } = useNav();
  const router = useRouter();
  const location = useLocation();
  const appRef = useRef<HTMLDivElement>(null);
  const [skinMenuOpen, setSkinMenuOpen] = useState(false);
  const skinMenuRef = useRef<HTMLDivElement>(null);

  // Determine active nav key from current path.
  const pathname = location.pathname;
  const items = navItems();
  const activeKey =
    items.find((item) => pathname.startsWith(item.path) && item.path !== '/')?.key ?? 'dashboard';

  // Sync data-nav attribute with the open state.
  useEffect(() => {
    if (appRef.current) {
      appRef.current.setAttribute('data-nav', isOpen ? 'open' : 'closed');
    }
  }, [isOpen]);

  // Close skin menu on outside click.
  useEffect(() => {
    if (!skinMenuOpen) return swallow;

    const handler = (e: MouseEvent) => {
      if (skinMenuRef.current && !skinMenuRef.current.contains(e.target as Node)) {
        setSkinMenuOpen(false);
      }
    };

    document.addEventListener('click', handler);
    return () => {
      document.removeEventListener('click', handler);
    };
  }, [skinMenuOpen]);

  const handleReset = useCallback(() => {
    void mockDb.reset().then(() => {
      toast('success', 'Data reset', 'Demo data has been restored to its original state.');
      void router.invalidate();
    });
  }, [router]);

  const handleSkinSelect = useCallback(
    (s: Skin) => {
      setSkin(s);
      setSkinMenuOpen(false);
    },
    [setSkin],
  );

  return (
    <>
      <a href="#main-content" className="mb-skip-link">
        Skip to main content
      </a>

      {/* ─── Header ─── */}
      <header className="mb-shell-header" role="banner">
        <button
          type="button"
          className="mb-header__action"
          onClick={() => {
            toggleNav();
          }}
          aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isOpen}
        >
          <span aria-hidden="true">{isOpen ? <Close size={20} /> : <Menu size={20} />}</span>
        </button>

        <Link
          to="/"
          className="mb-header__wordmark"
          aria-label="Cornerstone Property Services — Home"
        >
          <Monogram />
          <span style={{ marginInlineStart: 'var(--cds-spacing-03)' }}>Cornerstone</span>
        </Link>

        <div className="mb-header__actions">
          {/* Skin switcher */}
          <div ref={skinMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="mb-header__action"
              onClick={() => {
                setSkinMenuOpen((prev) => !prev);
              }}
              aria-label="Change brand skin"
              aria-haspopup="true"
              aria-expanded={skinMenuOpen}
            >
              <ColorPalette size={20} />
            </button>

            {skinMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  zIndex: 'var(--cds-z-header)',
                  padding: 'var(--cds-spacing-03)',
                  backgroundColor: 'var(--cds-shell-bg)',
                  border: '1px solid var(--cds-shell-hover)',
                  display: 'flex',
                  gap: 'var(--cds-spacing-03)',
                }}
              >
                {SKINS.map((s) => (
                  <SkinChip key={s} skin={s} currentSkin={skin} onSelect={handleSkinSelect} />
                ))}
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            className="mb-header__action"
            onClick={() => {
              toggleTheme();
            }}
            aria-label={theme === 'g100' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'g100' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Reset demo */}
          <button
            type="button"
            className="mb-header__action"
            onClick={handleReset}
            aria-label="Reset demo data"
          >
            <Reset size={20} />
          </button>
        </div>
      </header>

      {/* ─── App grid ─── */}
      <div ref={appRef} className="mb-app" data-nav={isOpen ? 'open' : 'closed'}>
        {/* Side nav */}
        <nav className="mb-sidenav" aria-label="Main navigation">
          <div className="mb-sidenav__label">Navigation</div>
          <ul className="mb-sidenav__list" role="list">
            {items.map((item) => (
              <li key={item.key}>
                <SidenavItem item={item} isActive={activeKey === item.key} />
              </li>
            ))}
          </ul>
        </nav>

        {/* Main content */}
        <main id="main-content" className="mb-main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      {/* Toasts */}
      <ToastRegion />
    </>
  );
}
