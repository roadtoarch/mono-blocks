/**
 * MonoBlocks — routes/_app/customers/new.tsx
 *
 * Create new customer.
 */
import { createFileRoute } from '@tanstack/react-router';

import { FormPage } from '@/components/FormPage';

export const Route = createFileRoute('/_app/customers/new')({
  component: NewCustomerPage,
});

function NewCustomerPage() {
  return <FormPage type="customer" />;
}
