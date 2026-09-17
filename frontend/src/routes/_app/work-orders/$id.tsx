/**
 * MonoBlocks — routes/_app/work-orders/$id.tsx
 *
 * Work order detail page.
 */
import { createFileRoute } from '@tanstack/react-router';

import { DetailPage } from '@/pages/DetailPage';

export const Route = createFileRoute('/_app/work-orders/$id')({
  component: WorkOrderDetailPage,
});

function WorkOrderDetailPage() {
  const { id } = Route.useParams();
  return <DetailPage type="work_order" id={id} />;
}
