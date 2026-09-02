/* eslint-disable react-refresh/only-export-components -- TanStack Router route files export both Route config and components by design. */
import { Loading } from '@carbon/react';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';

import AppShell from '../components/AppShell';

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
});

/**
 * Pathless layout route that guards all child routes behind authentication.
 * Wraps authenticated content in the {@link AppShell} layout.
 */
function AuthenticatedLayout() {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      void auth.signinRedirect();
    }
  }, [auth]);

  if (auth.isLoading) {
    return <Loading withOverlay description="Loading authentication…" />;
  }

  if (!auth.isAuthenticated) {
    return <Loading withOverlay description="Redirecting to sign in…" />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
