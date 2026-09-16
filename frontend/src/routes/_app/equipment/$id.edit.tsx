/**
 * MonoBlocks — routes/_app/equipment/$id.edit.tsx
 *
 * Edit equipment.
 */
import { createFileRoute } from '@tanstack/react-router';

import { FormPage } from '@/components/FormPage';

export const Route = createFileRoute('/_app/equipment/$id/edit')({
  component: EditEquipmentPage,
});

function EditEquipmentPage() {
  const { id } = Route.useParams();
  return <FormPage type="equipment" id={id} />;
}
