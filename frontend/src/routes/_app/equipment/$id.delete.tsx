/**
 * MonoBlocks — routes/_app/equipment/$id.delete.tsx
 *
 * Delete equipment confirmation.
 */
import { createFileRoute } from '@tanstack/react-router';

import { DeletePage } from '@/pages/DeletePage';

export const Route = createFileRoute('/_app/equipment/$id/delete')({
  component: DeleteEquipmentPage,
});

function DeleteEquipmentPage() {
  const { id } = Route.useParams();
  return <DeletePage type="equipment" id={id} />;
}
