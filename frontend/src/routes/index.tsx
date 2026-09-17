/**
 * MonoBlocks — routes/index.tsx
 *
 * Root route (/) — delegates to LandingPage.
 */
import { createFileRoute } from '@tanstack/react-router';

import { LandingPage } from '@/pages/LandingPage';

export const Route = createFileRoute('/')({
  component: LandingPage,
});
