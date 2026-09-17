/**
 * MonoBlocks — routes/_app/sites/$id.delete.tsx
 *
 * Delete site confirmation.
 */
import { createFileRoute } from '@tanstack/react-router';

import { DeletePage } from '@/pages/DeletePage';

export const Route = createFileRoute('/_app/sites/$id/delete')({
  component: DeleteSitePage,
});

function DeleteSitePage() {
  const { id } = Route.useParams();
  return <DeletePage type="site" id={id} />;
}
