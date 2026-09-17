/**
 * MonoBlocks — routes/_app/customers/$id.delete.tsx
 *
 * Delete customer confirmation.
 */
import { createFileRoute } from '@tanstack/react-router';

import { DeletePage } from '@/pages/DeletePage';

export const Route = createFileRoute('/_app/customers/$id/delete')({
  component: DeleteCustomerPage,
});

function DeleteCustomerPage() {
  const { id } = Route.useParams();
  return <DeletePage type="customer" id={id} />;
}
