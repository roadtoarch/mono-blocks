/**
 * MonoBlocks — routes/_app/technicians/$id.tsx
 *
 * Technician detail page.
 */
import { createFileRoute } from '@tanstack/react-router';

import { DetailPage } from '@/components/DetailPage';

export const Route = createFileRoute('/_app/technicians/$id')({
  component: TechnicianDetailPage,
});

function TechnicianDetailPage() {
  const { id } = Route.useParams();
  return <DetailPage type="technician" id={id} />;
}
