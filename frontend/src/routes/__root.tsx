/**
 * MonoBlocks — routes/__root.tsx
 *
 * Root route. Only renders an Outlet — layout is handled by child layout routes.
 */
import { createRootRoute, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => <Outlet />,
});
