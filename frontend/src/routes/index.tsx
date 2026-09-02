/* eslint-disable react-refresh/only-export-components -- TanStack Router route files export both Route config and components by design. */
import { Button, Loading, Tile } from '@carbon/react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';

import { useTenant } from '../tenant/useTenant';

import type { TenantConfig } from '../tenant/tenant.types';
import type { FC } from 'react';

export const Route = createFileRoute('/')({
  component: IndexPage,
});

interface LandingPageProps {
  readonly onSignIn: () => void;
  readonly tenant: TenantConfig;
}

/** Unauthenticated landing page with tenant branding and a Carbon sign-in button. */
const LandingPage: FC<LandingPageProps> = ({ onSignIn, tenant }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '2rem',
    }}
  >
    {tenant.theme.logoUrl !== '' && (
      <img
        src={tenant.theme.logoUrl}
        alt={`${tenant.displayName} logo`}
        style={{ maxHeight: '4rem', marginBottom: '1rem' }}
      />
    )}
    <Tile style={{ maxWidth: '32rem', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>
        {tenant.content?.welcomeHeading ?? tenant.displayName}
      </h1>
      <p style={{ marginBottom: '1.5rem' }}>
        {tenant.content?.welcomeBody ?? 'Sign in with your Keycloak account to continue.'}
      </p>
      <Button kind="primary" onClick={onSignIn}>
        Sign in
      </Button>
    </Tile>
  </div>
);

function IndexPage() {
  const auth = useAuth();
  const tenant = useTenant();
  const navigate = useNavigate({ from: '/' });

  useEffect(() => {
    if (auth.isAuthenticated) {
      void navigate({ to: '/dashboard' });
    }
  }, [auth.isAuthenticated, navigate]);

  if (auth.isLoading) {
    return <Loading withOverlay description="Loading authentication…" />;
  }

  if (auth.error) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          padding: '2rem',
        }}
      >
        <Tile style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ marginBottom: '0.5rem' }}>Authentication error</h1>
          <p>{auth.error.message}</p>
        </Tile>
      </div>
    );
  }

  if (auth.isAuthenticated) {
    return <Loading withOverlay description="Redirecting to dashboard…" />;
  }

  return <LandingPage onSignIn={() => void auth.signinRedirect()} tenant={tenant} />;
}
