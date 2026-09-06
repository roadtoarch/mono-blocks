/* eslint-disable react-refresh/only-export-components -- TanStack Router route files export both Route config and components by design. */
import { Loading } from '@carbon/react';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';

/**
 * Auth-aware not-found fallback rendered when no route matches.
 *
 * - **Unauthenticated**: redirects to `/` (landing page) so the user
 *   can sign in rather than seeing a blank/error screen.
 * - **Authenticated**: renders a simple "Content Not Found" tile inside
 *   the AppShell so the user stays within the authenticated shell.
 */
function NotFoundFallback() {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      void auth.signinRedirect();
    }
  }, [auth]);

  if (auth.isLoading) return <Loading withOverlay description="Loading…" />;
  if (!auth.isAuthenticated) return null; // signing in…

  return (
    <div style={{ padding: '2rem', maxWidth: '48rem', margin: '0 auto' }}>
      <h1>Content Not Found</h1>
      <p>The page you are looking for does not exist.</p>
    </div>
  );
}

/**
 * Root route — renders the child route via {@link Outlet} and registers the
 * global `auth:unauthorized` event listener that redirects to Keycloak when
 * the API returns a 401. Also provides an auth-aware {@link NotFoundFallback}
 * when no child route matches.
 */
function RootRoute() {
  const auth = useAuth();

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

  return <Outlet />;
}

export const Route = createRootRoute({
  component: RootRoute,
  notFoundComponent: NotFoundFallback,
});
