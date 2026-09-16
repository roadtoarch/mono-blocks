/**
 * MonoBlocks — routes/_app/technicians/$id.edit.tsx
 *
 * Edit technician.
 */
import { createFileRoute } from '@tanstack/react-router';

import { FormPage } from '@/components/FormPage';

export const Route = createFileRoute('/_app/technicians/$id/edit')({
  component: EditTechnicianPage,
});

function EditTechnicianPage() {
  const { id } = Route.useParams();
  return <FormPage type="technician" id={id} />;
}
