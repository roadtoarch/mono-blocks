/**
 * MonoBlocks — routes/_app/dashboard.tsx
 *
 * Dashboard page. Under _app layout (has chrome).
 */
import { createFileRoute } from '@tanstack/react-router';

import { DashboardPage } from '@/components/DashboardPage';

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardPage,
});
