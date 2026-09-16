/**
 * MonoBlocks — routes/_app/customers/$id.tsx
 *
 * Customer detail page.
 */
import { createFileRoute } from '@tanstack/react-router';

import { DetailPage } from '@/components/DetailPage';

export const Route = createFileRoute('/_app/customers/$id')({
  component: CustomerDetailPage,
});

function CustomerDetailPage() {
  const { id } = Route.useParams();
  return <DetailPage type="customer" id={id} />;
}
