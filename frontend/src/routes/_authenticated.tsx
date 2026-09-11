/* eslint-disable react-refresh/only-export-components -- TanStack Router route files export both Route config and components by design. */
import { Loading } from '@carbon/react';
import { createFileRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';

import AppShell from '../components/AppShell';

import { persistRedirectUrl } from './-redirectStorage';

/**
 * Pathless layout route that guards all child routes behind authentication.
 * Wraps authenticated content in the {@link AppShell} layout.
 */
const AuthenticatedLayout = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const { pathname } = useRouterState({ select: (s) => s.location });

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      /* Persist the attempted URL so we can restore it after OIDC login completes.
         The index page reads this value post-login and navigates there. */
      if (pathname !== '/login') {
        persistRedirectUrl(pathname);
      }
      void auth.signinRedirect();
    }
  }, [auth, pathname, navigate]);

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
};

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
});
