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
import { IconButton, Tooltip } from '@carbon/react';

import { useOfflineAllowed } from './use-offline-allowed';
import { useRecordPin } from './use-record-pin';
import { useStorageBudget } from './use-storage-budget';

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
 *
 * When storage usage is ≥90%, the button is disabled and a tooltip
 * explains that the user must unpin other records first. Unpinning
 * is always allowed even at critical storage levels.
 */
export function PinButton({ contentType, contentId, userId, className, label }: PinButtonProps) {
  const offlineAllowed = useOfflineAllowed();
  const { canPin } = useStorageBudget();
  const { isPinned, toggle } = useRecordPin({
    contentType,
    contentId,
    userId,
    canPin,
  });

  if (!offlineAllowed) {
    return null;
  }

  const iconDescription = label ?? (isPinned ? 'Unpin from offline' : 'Pin for offline');

  const button = (
    <IconButton
      kind="ghost"
      size="sm"
      label={iconDescription}
      align="bottom"
      className={className}
      disabled={!canPin && !isPinned}
      onClick={() => void toggle()}
    >
      {isPinned ? <PinFilled size={20} /> : <Pin size={20} />}
    </IconButton>
  );

  // Wrap in tooltip when pinning is blocked but unpinning is still possible.
  if (!canPin && !isPinned) {
    return (
      <Tooltip label="Storage is nearly full — unpin other records first" align="bottom">
        {button}
      </Tooltip>
    );
  }

  return button;
}
