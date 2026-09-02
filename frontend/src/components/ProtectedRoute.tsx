import { Loading } from '@carbon/react';
import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';

import type { FC, ReactNode } from 'react';

interface ProtectedRouteProps {
  readonly children: ReactNode;
}

/**
 * Minimal auth guard — shows a Carbon {@link Loading} spinner while OIDC
 * initialises, redirects to Keycloak when unauthenticated, and renders
 * children once the user has a valid session.
 */
const ProtectedRoute: FC<ProtectedRouteProps> = ({ children }) => {
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

  return <>{children}</>;
};

export default ProtectedRoute;
