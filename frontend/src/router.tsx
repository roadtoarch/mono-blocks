import { createRouter } from '@tanstack/react-router';

import { routeTree } from './routeTree.gen';

/**
 * Application router — created with the auto-generated route tree from
 * TanStack Router's Vite plugin (`@tanstack/router-plugin`).
 *
 * The router is instantiated after tenant resolution in `main.tsx` so that
 * the OIDC and tenant providers are available before any route renders.
 */
export function createAppRouter() {
  return createRouter({ routeTree });
}

/* ------------------------------------------------------------------ */
/* TypeScript module augmentation for TanStack Router's type-safety.   */
/* ------------------------------------------------------------------ */
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
