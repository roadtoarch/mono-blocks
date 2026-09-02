import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';

import './index.css';
import './styles.scss';
import { createOidcConfig } from './auth/createOidcConfig';
import { createAppRouter } from './router';
import { applyTenantTheme, applyTenantTypography } from './tenant/applyTheme';
import { resolveTenant } from './tenant/resolveTenant';
import TenantProvider from './tenant/TenantProvider';

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

  const oidcConfig = createOidcConfig(tenant);
  const router = createAppRouter();

  createRoot(rootElement).render(
    <StrictMode>
      <TenantProvider value={tenant}>
        <AuthProvider {...oidcConfig}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </AuthProvider>
      </TenantProvider>
    </StrictMode>,
  );
})();
