/* eslint-disable react-refresh/only-export-components -- TanStack Router route files export both Route config and components by design. */
import { Loading } from '@carbon/react';
import {
  createFileRoute,
  Outlet,
  useMatches,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';

import AppShell from '../components/AppShell';
import { ConnectivityBanner } from '../components/connectivity/connectivity-banner';
import { OutboxErrorNotification } from '../components/connectivity/outbox-error-notification';
import { SwUpdateBanner } from '../components/connectivity/sw-update-banner';
import { OfflineGuard } from '../components/offline/offline-guard';
import { StorageWarning } from '../components/offline/storage-warning';

import { persistRedirectUrl } from './-redirectStorage';

/**
 * Reads the `offlineAvailable` flag from the deepest matched route's
 * `staticData`, falling back to `false` if no route declares it.
 */
const useRouteOfflineAvailable = (): boolean => {
  const matches = useMatches();
  // The last match is the deepest (leaf) route.
  const leaf = matches[matches.length - 1];
  return (leaf.staticData as Record<string, unknown> | undefined)?.offlineAvailable === true;
};

/**
 * Pathless layout route that guards all child routes behind authentication.
 * Wraps authenticated content in the {@link AppShell} layout with
 * {@link OfflineGuard} and {@link ConnectivityBanner}.
 */
const AuthenticatedLayout = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const { pathname } = useRouterState({ select: (s) => s.location });
  const isOfflineAvailable = useRouteOfflineAvailable();

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
      <ConnectivityBanner />
      <SwUpdateBanner />
      <OutboxErrorNotification />
      <StorageWarning />
      <OfflineGuard isOfflineAvailable={isOfflineAvailable}>
        <Outlet />
      </OfflineGuard>
    </AppShell>
  );
};

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
});
