/**
 * MonoBlocks — routes/_app/technicians/index.tsx
 *
 * Technician list page.
 */
import { createFileRoute } from '@tanstack/react-router';

import { ListPage } from '@/components/ListPage';

export const Route = createFileRoute('/_app/technicians/')({
  component: TechnicianListPage,
});

function TechnicianListPage() {
  return <ListPage type="technician" />;
}
