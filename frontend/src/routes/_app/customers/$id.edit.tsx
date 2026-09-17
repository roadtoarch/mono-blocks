/**
 * MonoBlocks — routes/_app/customers/$id.edit.tsx
 *
 * Edit customer.
 */
import { createFileRoute } from '@tanstack/react-router';

import { FormPage } from '@/pages/FormPage';

export const Route = createFileRoute('/_app/customers/$id/edit')({
  component: EditCustomerPage,
});

function EditCustomerPage() {
  const { id } = Route.useParams();
  return <FormPage type="customer" id={id} />;
}
