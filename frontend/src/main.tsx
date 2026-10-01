/**
 * MonoBlocks — main.tsx
 *
 * Application entry point. Sets up:
 * 1. The real HTTP transport (axios pipeline) for the generic core API
 * 2. CSS imports (tokens → base → shell → components)
 * 3. TanStack Router (file-based route tree)
 * 4. TanStack Query (server state cache)
 * 5. React 19 root
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/styles.scss';

import { routeTree } from './routeTree.gen';

import { clearResourceCache } from '@/api/resources';
import { setTransport } from '@/api/transport-resolver';
import { request } from '@/http';

// Point every Resource at the live API once, before any component renders.
// The token provider stays unset — the backend is fully open.
setTransport(request);
clearResourceCache();

// TanStack Query — single client for the app lifetime.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min — server data is refetched on invalidation.
      retry: 2,
    },
  },
});

const router = createRouter({ routeTree, context: { queryClient } });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
  interface RouteContext {
    queryClient: QueryClient;
  }
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ queryClient }} />
    </QueryClientProvider>
  </StrictMode>,
);
