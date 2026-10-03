import { Column, Grid } from '@carbon/react';

import { LinkButton } from '@/components/LinkButton';
import { useTheme } from '@/hooks';

import './index.scss';
import Monogram from '@/components/LogoMonogram';


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
            <div className="mb-landing__logo">
              <Monogram size={64}  title="Cornerstone Property Services" />
            </div>
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
