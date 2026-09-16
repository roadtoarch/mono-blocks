/**
 * MonoBlocks — routes/_app/sites/$id.edit.tsx
 *
 * Edit site.
 */
import { createFileRoute } from '@tanstack/react-router';

import { FormPage } from '@/components/FormPage';

export const Route = createFileRoute('/_app/sites/$id/edit')({
  component: EditSitePage,
});

function EditSitePage() {
  const { id } = Route.useParams();
  return <FormPage type="site" id={id} />;
}
