/**
 * Outbox indicator — badge that shows the number of pending mutations
 * in the offline outbox, visible only to users with the
 * `OFFLINE_ALLOWED` realm role.
 *
 * @module components/connectivity/outbox-indicator
 */

import { CloudOffline } from '@carbon/icons-react';
import { HeaderGlobalAction, Tag } from '@carbon/react';

import { useConnectivity } from './use-connectivity';

import type { FC } from 'react';

import { useOfflineAllowed } from '@/offline/use-offline-allowed';

/**
 * Header action that surfaces the outbox pending count as a badge.
 *
 * Returns `null` when:
 * - The user does not have the `OFFLINE_ALLOWED` realm role.
 * - There are zero pending mutations.
 *
 * This keeps the header uncluttered for users who don't use offline
 * features or have no pending operations.
 *
 * @example
 * ```tsx
 * <HeaderGlobalBar>
 *   <OutboxIndicator />
 *   <ThemeToggle />
 * </HeaderGlobalBar>
 * ```
 */
export const OutboxIndicator: FC = () => {
  const offlineAllowed = useOfflineAllowed();
  const { pendingCount } = useConnectivity();

  if (!offlineAllowed || pendingCount === 0) {
    return null;
  }

  const countLabel = String(pendingCount > 99 ? '99+' : pendingCount);

  return (
    <HeaderGlobalAction
      aria-label={`${String(pendingCount)} pending change${pendingCount !== 1 ? 's' : ''} queued for sync`}
      tooltipAlignment="end"
    >
      <CloudOffline size={20} />
      <Tag
        size="sm"
        type="high-contrast"
        style={{ position: 'absolute', top: '-0.25rem', right: '-0.25rem', minWidth: '1.25rem' }}
      >
        {countLabel}
      </Tag>
    </HeaderGlobalAction>
  );
};
