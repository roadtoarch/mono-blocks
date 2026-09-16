/**
 * MonoBlocks — routes/_app/sites/new.tsx
 *
 * Create new site.
 */
import { createFileRoute } from '@tanstack/react-router';

import { FormPage } from '@/components/FormPage';

export const Route = createFileRoute('/_app/sites/new')({
  component: NewSitePage,
});

function NewSitePage() {
  return <FormPage type="site" />;
}
