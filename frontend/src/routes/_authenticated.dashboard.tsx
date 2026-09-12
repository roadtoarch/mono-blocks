/* eslint-disable react-refresh/only-export-components -- TanStack Router route files export both Route config and components by design. */
import { Tile } from '@carbon/react';
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from 'react-oidc-context';

import { useMeQuery } from '../api/me';
import { useTenant } from '../tenant/useTenant';

/** Reads the `tenant_id` claim off the OIDC user profile if present. */
const tenantIdFromUser = (user: ReturnType<typeof useAuth>['user']): string | undefined => {
  const claim = user?.profile.tenant_id;
  return typeof claim === 'string' ? claim : undefined;
};

/** Dashboard page — displays the authenticated user's profile and tenant info. */
const DashboardPage = () => {
  const auth = useAuth();
  const tenant = useTenant();
  const meQuery = useMeQuery(auth.user?.access_token);

  const tenantId = tenantIdFromUser(auth.user);
  const footerText = tenant.content?.footerText ?? '';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <div style={{ padding: '2rem', flex: 1 }}>
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
      {footerText !== '' && (
        <footer
          style={{
            padding: '1rem 2rem',
            textAlign: 'center',
            fontSize: '0.875rem',
            color: 'var(--cds-text-secondary, #525252)',
          }}
        >
          {footerText}
        </footer>
      )}
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/dashboard')({
  staticData: { offlineAvailable: true },
  component: DashboardPage,
});
