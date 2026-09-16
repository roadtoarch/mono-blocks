/**
 * MonoBlocks — routes/_app/equipment/index.tsx
 *
 * Equipment list page.
 */
import { createFileRoute } from '@tanstack/react-router';

import { ListPage } from '@/components/ListPage';

export const Route = createFileRoute('/_app/equipment/')({
  component: EquipmentListPage,
});

function EquipmentListPage() {
  return <ListPage type="equipment" />;
}
