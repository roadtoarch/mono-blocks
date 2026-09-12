import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';

import './styles.scss';
import { applyTenantTheme, applyTenantTypography } from './tenant/applyTheme';
import { resolveTenant } from './tenant/resolveTenant';
import TenantProvider from './tenant/TenantProvider';

import { createOidcConfig } from '@/auth/createOidcConfig';
import { outboxAdapter } from '@/db/outbox-adapter';
import { createOutboxSyncEngine } from '@/db/outbox-sync';
import { env } from '@/env';
import {
  defaultClient,
  setDefaultOfflinePredicate,
  setDefaultTokenProvider,
  setDefaultUserIdProvider,
} from '@/http/api-client';
import { pinAdapter } from '@/offline/pin-adapter';
import { createDexiePersister } from '@/offline/query-persister';
import { createAppRouter } from '@/router';

const queryClient = new QueryClient();

/**
 * Pin-aware Dexie persister for TanStack Query cache.
 *
 * The `getUserId` callback reads the current OIDC user ID from the
 * UserManager (set up later in the async block). Until the manager
 * is available, it returns `undefined`, causing the persister to
 * skip writes.
 */
let userManagerRef: import('oidc-client-ts').UserManager | undefined;

const getUserId = async (): Promise<string | undefined> => {
  if (!userManagerRef) return undefined;
  const user = await userManagerRef.getUser();
  return user?.profile.sub;
};

const persister = createDexiePersister(pinAdapter, getUserId);

// Persist the query cache to IndexedDB (DEC-5: app-level caching).
// maxAge uses the configurable stale threshold (NFR-9).
void persistQueryClient({
  queryClient,
  persister,
  maxAge: env.VITE_OFFLINE_STALE_AGE_MS,
});

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

  // Expose the UserManager to the persister so it can read the
  // current user ID for pin-aware filtering.
  userManagerRef = userManager;

  // Wire the OIDC UserManager into the API pipeline so that every
  // request through the default ApiClient automatically includes
  // the current access token (or null if not yet authenticated).
  setDefaultTokenProvider(async () => {
    const user = await userManager.getUser();
    return user?.access_token ?? null;
  });

  // Wire the user ID provider for the offline middleware and persister.
  setDefaultUserIdProvider(async () => {
    const user = await userManager.getUser();
    return user?.profile.sub;
  });

  // Wire the OFFLINE_ALLOWED predicate for the offline middleware (DEC-7).
  // Reads OIDC realm_access.roles from the ID token (Approach A requires
  // the 'roles' scope in the OIDC config — see createOidcConfig.ts).
  // Profile type does not include realm_access — cast through unknown.
  setDefaultOfflinePredicate(async () => {
    const user = await userManager.getUser();
    const profile = user?.profile as Record<string, unknown> | undefined;
    const realmAccess = profile?.realm_access as { roles?: string[] } | undefined;
    const roles: readonly string[] = realmAccess?.roles ?? [];
    return roles.includes('OFFLINE_ALLOWED');
  });

  // Start the outbox sync engine — listens for 'online' events and
  // replays pending mutations through the full middleware pipeline.
  const syncEngine = createOutboxSyncEngine({
    adapter: outboxAdapter,
    client: defaultClient,
    invalidateQueries: (entityTypes) => {
      for (const type of entityTypes) {
        void queryClient.invalidateQueries({ queryKey: [type] });
        // Also invalidate the plural form (list queries).
        void queryClient.invalidateQueries({ queryKey: [`${type}s`] });
      }
    },
  });
  syncEngine.start();

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

/**
 * Service Worker registration (DEC-11).
 *
 * Disabled by default in development to avoid caching conflicts with HMR.
 * Enable with `VITE_ENABLE_SW=true` (env var or window.config).
 * In production, the SW registers automatically if the browser supports it.
 */
if (env.VITE_ENABLE_SW && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((reg) => {
      console.log('[SW] registered', reg.scope);
    })
    .catch((err: unknown) => {
      console.error('[SW] registration failed', err);
    });
}
