/**
 * MonoBlocks — routes/_app/work-orders/$id.delete.tsx
 *
 * Delete work order confirmation.
 */
import { createFileRoute } from '@tanstack/react-router';

import { DeletePage } from '@/pages/DeletePage';

export const Route = createFileRoute('/_app/work-orders/$id/delete')({
  component: DeleteWorkOrderPage,
});

function DeleteWorkOrderPage() {
  const { id } = Route.useParams();
  return <DeletePage type="work_order" id={id} />;
}
