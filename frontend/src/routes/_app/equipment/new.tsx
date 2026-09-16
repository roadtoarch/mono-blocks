/**
 * MonoBlocks — routes/_app/equipment/new.tsx
 *
 * Create new equipment.
 */
import { createFileRoute } from '@tanstack/react-router';

import { FormPage } from '@/components/FormPage';

export const Route = createFileRoute('/_app/equipment/new')({
  component: NewEquipmentPage,
});

function NewEquipmentPage() {
  return <FormPage type="equipment" />;
}
