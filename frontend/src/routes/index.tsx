/**
 * MonoBlocks — routes/index.tsx
 *
 * Landing page — outside the _app layout (no chrome).
 * Shows brand monogram, tagline, enter CTA, and skin switcher.
 * Port of prototype index.html landing page.
 */
import { createFileRoute, Link } from '@tanstack/react-router';

import type { Skin } from '@/stores/theme';

import { useTheme } from '@/hooks';

const SKINS: { key: Skin; label: string }[] = [
  { key: 'cornerstone', label: 'Cornerstone Blue' },
  { key: 'mono', label: 'Graphite Mono' },
  { key: 'ember', label: 'Ember' },
];

/**
 * Landing monogram SVG — 3 stacked rects (2 currentColor, 1 brand accent).
 * Matches the favicon and header monogram.
 * Prototype layout: bottom 2 rects (currentColor) + top 1 rect (accent).
 */
function LandingMonogram() {
  return (
    <div className="mb-landing__logo" aria-hidden="true">
      <svg viewBox="0 0 48 48" width="64" height="64" focusable="false">
        <rect x="4" y="28" width="17" height="16" fill="currentColor" />
        <rect x="27" y="28" width="17" height="16" fill="currentColor" />
        <rect x="15.5" y="6" width="17" height="16" fill="var(--cds-button-primary)" />
      </svg>
    </div>
  );
}

/**
 * Landing page component.
 */
function LandingPage() {
  const { skin, setSkin } = useTheme();

  return (
    <div className="mb-landing">
      <LandingMonogram />

      <h1 className="mb-landing__title">Cornerstone Property Services</h1>
      <p className="mb-landing__tagline">
        Property management and field maintenance, coordinated in one place: customers, sites,
        equipment, technicians and work orders — with every journey from search to sign-off.
      </p>

      <Link to="/dashboard" className="mb-btn mb-btn--primary">
        Enter the app
      </Link>

      <div className="mb-skin-switcher">
        <p className="mb-skin-switcher__label" id="mb-skin-label">
          Swap the brand tokens — same app:
        </p>
        <div className="mb-skin-switcher__options" role="group" aria-labelledby="mb-skin-label">
          {SKINS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`mb-skin-chip${skin === s.key ? ' is-selected' : ''}`}
              data-skin={s.key}
              onClick={() => {
                setSkin(s.key);
              }}
              aria-pressed={skin === s.key}
            >
              <span className="mb-skin-chip__swatch" aria-hidden="true" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <footer>
        <p className="mb-landing__footer mb-built-on">Built on MonoBlocks</p>
      </footer>
    </div>
  );
}

export const Route = createFileRoute('/')({
  component: LandingPage,
});
