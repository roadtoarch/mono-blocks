/**
 * MonoBlocks — routes/_app/sites/index.tsx
 *
 * Site list page.
 */
import { createFileRoute } from '@tanstack/react-router';

import { ListPage } from '@/components/ListPage';

export const Route = createFileRoute('/_app/sites/')({
  component: SiteListPage,
});

function SiteListPage() {
  return <ListPage type="site" />;
}
