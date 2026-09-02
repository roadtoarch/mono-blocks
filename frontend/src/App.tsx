import { Button, Loading, Tile } from '@carbon/react';
import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';

import { useMeQuery } from './api/me.ts';
import AppShell from './components/AppShell.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import { useTenant } from './tenant/useTenant';

import type { TenantConfig } from './tenant/tenant.types';
import type { FC } from 'react';

/** Reads the `tenant_id` claim off the OIDC user profile if present. */
function tenantIdFromUser(user: ReturnType<typeof useAuth>['user']): string | undefined {
  const claim = user?.profile.tenant_id;
  return typeof claim === 'string' ? claim : undefined;
}

/** Authenticated content displayed inside the app shell. */
const AuthenticatedContent: FC = () => {
  const auth = useAuth();
  const meQuery = useMeQuery(auth.user?.access_token);

  const tenantId = tenantIdFromUser(auth.user);

  return (
    <div style={{ padding: '2rem' }}>
      <Tile>
        <h3 style={{ marginBottom: '1rem' }}>Signed in</h3>
        <p>
          <strong>Name:</strong> {auth.user?.profile.name ?? '—'}
        </p>
        <p>
          <strong>Email:</strong> {auth.user?.profile.email ?? '—'}
        </p>
        <p>
          <strong>Tenant (id token):</strong> {tenantId ?? '—'}
        </p>
        <p>
          <strong>Tenant (/api/me round-trip):</strong>{' '}
          {meQuery.isPending
            ? 'Loading…'
            : meQuery.isError
              ? `Error: ${meQuery.error.message}`
              : meQuery.data.tenant_id}
        </p>
      </Tile>
    </div>
  );
};

interface LandingPageProps {
  readonly onSignIn: () => void;
  readonly tenant: TenantConfig;
}

/** Unauthenticated landing page with tenant branding and a Carbon-styled sign-in button. */
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
      <h1 style={{ marginBottom: '0.5rem' }}>{tenant.displayName}</h1>
      <p style={{ marginBottom: '1.5rem' }}>Sign in with your Keycloak account to continue.</p>
      <Button kind="primary" onClick={onSignIn}>
        Sign in
      </Button>
    </Tile>
  </div>
);

const App: FC = () => {
  const auth = useAuth();
  const tenant = useTenant();

  /* Redirect to Keycloak when a 401 is received from the API. */
  useEffect(() => {
    const handleUnauthorized = () => {
      void auth.signinRedirect();
    };
    globalThis.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      globalThis.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [auth]);

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

  if (!auth.isAuthenticated) {
    return <LandingPage onSignIn={() => void auth.signinRedirect()} tenant={tenant} />;
  }

  return (
    <ProtectedRoute>
      <AppShell>
        <AuthenticatedContent />
      </AppShell>
    </ProtectedRoute>
  );
};

export default App;
