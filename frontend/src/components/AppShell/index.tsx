/**
 * MonoBlocks — components/AppShell.tsx
 *
 * App chrome: fixed 48px header, push-style side nav, main content area.
 * Always-dark shell chrome (shell-bg tokens are constant across themes).
 * Uses useTheme, useNav hooks for reactive state.
 */
import { Close, ColorPalette, Menu, Moon, Reset, Sun } from '@carbon/icons-react';
import {
  Button,
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderName,
  SideNav,
  SideNavItems,
  SideNavLink,
  SkipToContent,
} from '@carbon/react';
import { Link, Outlet, useLocation, useRouter } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';

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
    <Button
      size="sm"
      kind={isSelected ? 'primary' : 'secondary'}
      className={`mb-skin-chip${isSelected ? ' is-selected' : ''}`}
      data-skin={skin}
      onClick={() => {
        onSelect(skin);
      }}
      aria-pressed={isSelected}
    >
      <span className="mb-skin-chip__swatch" aria-hidden="true" />
      <span>{label}</span>
    </Button>
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
export const AppShell = () => {
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
      <SkipToContent className="mb-skip-link">Skip to main content</SkipToContent>

      {/* ─── Header ─── */}
      <Header className="mb-shell-header" aria-label="MonoBlocks application header">
        <HeaderMenuButton
          className="mb-header__action"
          isActive={isOpen}
          onClick={toggleNav}
          aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          renderMenuIcon={<Menu size={20} />}
          renderCloseIcon={<Close size={20} />}
        />

        <HeaderName
          as={Link}
          to="/"
          prefix=""
          aria-label="Cornerstone Property Services — Home"
          className="mb-header__wordmark"
        >
          <Monogram />
          <span style={{ marginInlineStart: 'var(--cds-spacing-03)' }}>Cornerstone</span>
        </HeaderName>

        <HeaderGlobalBar className="mb-header__actions">
          {/* Skin switcher */}
          <div ref={skinMenuRef} style={{ position: 'relative' }}>
            <HeaderGlobalAction
              className="mb-header__action"
              aria-label="Change brand skin"
              onClick={() => {
                setSkinMenuOpen((prev) => !prev);
              }}
              isActive={skinMenuOpen}
            >
              <ColorPalette size={20} />
            </HeaderGlobalAction>

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
          <HeaderGlobalAction
            className="mb-header__action"
            aria-label={theme === 'g100' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={toggleTheme}
          >
            {theme === 'g100' ? <Sun size={20} /> : <Moon size={20} />}
          </HeaderGlobalAction>

          {/* Reset demo */}
          <HeaderGlobalAction
            className="mb-header__action"
            aria-label="Reset demo data"
            onClick={handleReset}
          >
            <Reset size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      {/* ─── App grid ─── */}
      <div ref={appRef} className="mb-app" data-nav={isOpen ? 'open' : 'closed'}>
        <SideNav
          className="mb-sidenav"
          aria-label="Main navigation"
          expanded={isOpen}
          onToggle={(_event, value) => {
            if (value !== isOpen) {
              toggleNav();
            }
          }}
        >
          <div className="mb-sidenav__label">Navigation</div>
          <SideNavItems>
            {items.map((item) => (
              <SideNavLink
                key={item.key}
                as={Link}
                to={item.path}
                isActive={activeKey === item.key}
                renderIcon={item.icon}
                aria-current={activeKey === item.key ? 'page' : undefined}
              >
                {item.label}
              </SideNavLink>
            ))}
          </SideNavItems>
        </SideNav>

        {/* Main content */}
        <main id="main-content" className="app-shell__main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      {/* Toasts */}
      <ToastRegion />
    </>
  );
};
