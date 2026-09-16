/**
 * MonoBlocks — routes/_app/work-orders/index.tsx
 *
 * Work order list page.
 */
import { createFileRoute } from '@tanstack/react-router';

import { ListPage } from '@/components/ListPage';

export const Route = createFileRoute('/_app/work-orders/')({
  component: WorkOrderListPage,
});

function WorkOrderListPage() {
  return <ListPage type="work_order" />;
}
