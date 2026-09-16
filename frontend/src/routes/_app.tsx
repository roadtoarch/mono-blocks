/**
 * MonoBlocks — routes/_app.tsx
 *
 * Layout route for all "app" pages (dashboard, entities).
 * Landing page (/) is outside this layout — it has no chrome.
 */
import { createFileRoute } from '@tanstack/react-router';

import { AppShell } from '@/components';

export const Route = createFileRoute('/_app')({
  component: AppShell,
});
