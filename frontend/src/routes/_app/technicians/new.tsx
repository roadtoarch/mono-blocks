/**
 * MonoBlocks — routes/_app/technicians/new.tsx
 *
 * Create new technician.
 */
import { createFileRoute } from '@tanstack/react-router';

import { FormPage } from '@/pages/FormPage';

export const Route = createFileRoute('/_app/technicians/new')({
  component: NewTechnicianPage,
});

function NewTechnicianPage() {
  return <FormPage type="technician" />;
}
