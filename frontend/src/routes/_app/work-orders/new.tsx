/**
 * MonoBlocks — routes/_app/work-orders/new.tsx
 *
 * Create new work order.
 */
import { createFileRoute } from '@tanstack/react-router';

import { FormPage } from '@/components/FormPage';

export const Route = createFileRoute('/_app/work-orders/new')({
  component: NewWorkOrderPage,
});

function NewWorkOrderPage() {
  return <FormPage type="work_order" />;
}
