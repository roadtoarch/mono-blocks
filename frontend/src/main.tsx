import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';

import './styles.scss';
import { applyTenantTheme, applyTenantTypography } from './tenant/applyTheme';
import { resolveTenant } from './tenant/resolveTenant';
import TenantProvider from './tenant/TenantProvider';

import { createOidcConfig } from '@/auth/createOidcConfig';
import { setDefaultTokenProvider } from '@/http/api-client';
import { createAppRouter } from '@/router';

const queryClient = new QueryClient();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found. Check index.html.');
}

/* Resolve tenant before mounting the React tree so the OIDC config, theme,
   and tenant context are all available from the first render. */
void (async () => {
  rootElement.textContent = 'Loading…';

  const tenant = await resolveTenant();
  applyTenantTheme(tenant.theme);
  applyTenantTypography(tenant.typography);
  document.title = tenant.displayName;

  const { authProviderProps, userManager } = createOidcConfig(tenant);

  // Wire the OIDC UserManager into the API pipeline so that every
  // request through the default ApiClient automatically includes
  // the current access token (or null if not yet authenticated).
  setDefaultTokenProvider(async () => {
    const user = await userManager.getUser();
    return user?.access_token ?? null;
  });

  const router = createAppRouter();

  createRoot(rootElement).render(
    <StrictMode>
      <TenantProvider value={tenant}>
        <AuthProvider {...authProviderProps}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </AuthProvider>
      </TenantProvider>
    </StrictMode>,
  );
})();
