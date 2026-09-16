/**
 * MonoBlocks — routes/_app/work-orders/$id.edit.tsx
 *
 * Edit work order.
 */
import { createFileRoute } from '@tanstack/react-router';

import { FormPage } from '@/components/FormPage';

export const Route = createFileRoute('/_app/work-orders/$id/edit')({
  component: EditWorkOrderPage,
});

function EditWorkOrderPage() {
  const { id } = Route.useParams();
  return <FormPage type="work_order" id={id} />;
}
