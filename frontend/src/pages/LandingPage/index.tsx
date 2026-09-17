/**
 * MonoBlocks — pages/LandingPage/index.tsx
 *
 * Landing page — outside the _app layout (no chrome).
 * Shows brand monogram, tagline, enter CTA, and skin switcher.
 * Port of prototype index.html landing page.
 */
import { Column, Grid } from '@carbon/react';

import { LinkButton } from '@/components/LinkButton';
import { useTheme } from '@/hooks';

import './index.scss';

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
export const LandingPage = () => {
  useTheme(); // skin/setSkin available here for the future skin switcher.

  return (
    <Grid fullWidth className="landing-grid">
      <Column className="landing-content-col" sm={4} md={4} lg={8}>
        <div className="landing-content-wrapper">
          <header className="landing-logo">
            <LandingMonogram />
          </header>

          <main>
            <h1 data-testid="landing-title" className="landing-title">
              Cornerstone Property Services
            </h1>

            <h2 data-testid="landing-subtitle" className="landing-subtitle">
              Property management and field maintenance, coordinated in one place: customers, sites,
              equipment, technicians and work orders — with every journey from search to sign-off.
            </h2>

            <div className="buttons-container single-row">
              <LinkButton kind="primary" to="/dashboard">
                Enter the app
              </LinkButton>
            </div>
          </main>
        </div>
      </Column>

      <Column
        className="landing-img-col"
        sm={4}
        md={4}
        lg={8}
        as="aside"
        aria-label="Landing image"
      >
        <picture>
          <source
            srcSet="/img/landing-400.avif 400w, /img/landing-572.avif 572w"
            sizes="(max-width: 572px) 100vw, 572px"
            type="image/avif"
          />
          <source
            srcSet="/img/landing-400.webp 400w, /img/landing-572.webp 572w"
            sizes="(max-width: 572px) 100vw, 572px"
            type="image/webp"
          />
          <img
            src="/img/landing.png"
            width="572"
            height="1024"
            loading="lazy"
            decoding="async"
            className="landing-img"
            alt="Cornerstone Property Services team at work in a city street, with a technician on a ladder and a service van in the background"
          />
        </picture>
      </Column>
    </Grid>
  );
};
