/**
 * Toggle button that pins/unpins a record for offline access (DEC-8).
 *
 * Renders a Carbon `IconButton` with a pin icon. Only visible to users
 * with the `OFFLINE_ALLOWED` realm role. The pin state is managed by
 * {@link useRecordPin}.
 *
 * @module offline/pin-button
 */

import { Pin, PinFilled } from '@carbon/icons-react';
import { IconButton } from '@carbon/react';

import { useOfflineAllowed } from './use-offline-allowed';
import { useRecordPin } from './use-record-pin';

export interface PinButtonProps {
  /** Singular entity type (e.g. `'user'`). */
  contentType: string;
  /** Backend identifier for the record. */
  contentId: string;
  /** OIDC subject (sub claim) of the current user. */
  userId: string | undefined;
  /** Optional additional CSS class. */
  className?: string;
  /** Optional accessible label override (default: "Pin for offline"). */
  label?: string;
}

/**
 * Pin/unpin toggle for a single record.
 *
 * Returns `null` if the user does not have the `OFFLINE_ALLOWED` role,
 * so it can be placed unconditionally in any component tree.
 */
export function PinButton({ contentType, contentId, userId, className, label }: PinButtonProps) {
  const offlineAllowed = useOfflineAllowed();
  const { isPinned, toggle } = useRecordPin({ contentType, contentId, userId });

  if (!offlineAllowed) {
    return null;
  }

  const iconDescription = label ?? (isPinned ? 'Unpin from offline' : 'Pin for offline');

  return (
    <IconButton
      kind="ghost"
      size="sm"
      label={iconDescription}
      align="bottom"
      className={className}
      onClick={() => void toggle()}
    >
      {isPinned ? <PinFilled size={20} /> : <Pin size={20} />}
    </IconButton>
  );
}
