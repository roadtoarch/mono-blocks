/* eslint-disable react-refresh/only-export-components -- TanStack Router route files export both Route config and components by design. */
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';

/**
 * Root route — renders the child route via {@link Outlet} and registers the
 * global `auth:unauthorized` event listener that redirects to Keycloak when
 * the API returns a 401.
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
});
