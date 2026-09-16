/**
 * MonoBlocks — routes/_app/technicians/$id.delete.tsx
 *
 * Delete technician confirmation.
 */
import { createFileRoute } from '@tanstack/react-router';

import { DeletePage } from '@/components/DeletePage';

export const Route = createFileRoute('/_app/technicians/$id/delete')({
  component: DeleteTechnicianPage,
});

function DeleteTechnicianPage() {
  const { id } = Route.useParams();
  return <DeletePage type="technician" id={id} />;
}
