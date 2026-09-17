/**
 * MonoBlocks — routes/_app/customers/index.tsx
 *
 * Customer list page.
 */
import { createFileRoute } from '@tanstack/react-router';

import { ListPage } from '@/pages/ListPage';

export const Route = createFileRoute('/_app/customers/')({
  component: CustomerListPage,
});

function CustomerListPage() {
  return <ListPage type="customer" />;
}
