/**
 * MonoBlocks — main.tsx
 *
 * Application entry point. Sets up:
 * 1. CSS imports (tokens → base → shell → components)
 * 2. TanStack Router (file-based route tree)
 * 3. TanStack Query (mock API cache)
 * 4. React 19 root
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/styles.scss';

import { routeTree } from './routeTree.gen';

// TanStack Query — single client for the app lifetime.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min — mock data doesn't change externally.
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
