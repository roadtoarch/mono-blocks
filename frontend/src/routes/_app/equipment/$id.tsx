/**
 * MonoBlocks — routes/_app/equipment/$id.tsx
 *
 * Equipment detail page.
 */
import { createFileRoute } from '@tanstack/react-router';

import { DetailPage } from '@/components/DetailPage';

export const Route = createFileRoute('/_app/equipment/$id')({
  component: EquipmentDetailPage,
});

function EquipmentDetailPage() {
  const { id } = Route.useParams();
  return <DetailPage type="equipment" id={id} />;
}
