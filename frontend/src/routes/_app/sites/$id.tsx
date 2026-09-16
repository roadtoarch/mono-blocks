/**
 * MonoBlocks — routes/_app/sites/$id.tsx
 *
 * Site detail page.
 */
import { createFileRoute } from '@tanstack/react-router';

import { DetailPage } from '@/components/DetailPage';

export const Route = createFileRoute('/_app/sites/$id')({
  component: SiteDetailPage,
});

function SiteDetailPage() {
  const { id } = Route.useParams();
  return <DetailPage type="site" id={id} />;
}
