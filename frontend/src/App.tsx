import { useAuth } from 'react-oidc-context';

import { useMeQuery } from './api/me';

import type { User } from 'oidc-client-ts';
import type { FC } from 'react';

/** Reads the `tenant_id` claim off the OIDC user profile if present. */
function tenantIdFromUser(user: User | null | undefined): string | undefined {
  const claim = user?.profile.tenant_id;
  return typeof claim === 'string' ? claim : undefined;
}

const App: FC = () => {
  const auth = useAuth();
  const meQuery = useMeQuery(auth.user?.access_token);

  if (auth.isLoading) {
    return (
      <main>
        <p>Loading…</p>
      </main>
    );
  }

  if (auth.error) {
    return (
      <main>
        <h1>Authentication error</h1>
        <p>{auth.error.message}</p>
      </main>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <main>
        <h1>Forest</h1>
        <p>Sign in with your Keycloak account to continue.</p>
        <button type="button" onClick={() => void auth.signinRedirect()}>
          Sign in
        </button>
      </main>
    );
  }

  const tenantId = tenantIdFromUser(auth.user);

  return (
    <main>
      <h1>Signed in</h1>
      <dl>
        <dt>Email</dt>
        <dd>{auth.user?.profile.email ?? '—'}</dd>
        <dt>Name</dt>
        <dd>{auth.user?.profile.name ?? '—'}</dd>
        <dt>Tenant (id token)</dt>
        <dd>{tenantId ?? '—'}</dd>
        <dt>Tenant (/api/me round-trip)</dt>
        <dd>
          {meQuery.isPending
            ? 'Loading…'
            : meQuery.isError
              ? `Error: ${meQuery.error.message}`
              : meQuery.data.tenant_id}
        </dd>
      </dl>
      <button type="button" onClick={() => void auth.signoutRedirect()}>
        Sign out
      </button>
    </main>
  );
};

export default App;
