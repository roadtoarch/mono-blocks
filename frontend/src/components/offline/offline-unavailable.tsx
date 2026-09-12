/**
 * Full-page "Content unavailable offline" message.
 *
 * Displayed by {@link OfflineGuard} when the user navigates to a
 * non-offline-available route while offline. Uses Carbon components
 * for visual consistency.
 *
 * @module components/offline/offline-unavailable
 */

import { CloudOffline } from '@carbon/icons-react';
import { Button, Tile } from '@carbon/react';

import type { FC } from 'react';

interface OfflineUnavailableProps {
  /** Render mode. @default 'fullpage' */
  readonly mode?: 'banner' | 'fullpage';
}

/**
 * Informs the user that the requested content is not available offline.
 *
 * - **fullpage** (default): centres the message vertically and
 *   horizontally with a large icon and explanatory text.
 * - **banner**: compact horizontal notification suitable for embedding
 *   above existing content.
 *
 * @example
 * ```tsx
 * <OfflineUnavailable />
 * <OfflineUnavailable mode="banner" />
 * ```
 */
export const OfflineUnavailable: FC<OfflineUnavailableProps> = ({ mode = 'fullpage' }) => {
  if (mode === 'banner') {
    return (
      <Tile
        role="status"
        style={{
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <CloudOffline size={20} />
        <span>This content is not available offline.</span>
      </Tile>
    );
  }

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <CloudOffline size={48} style={{ marginBottom: '1rem' }} />
      <h2 style={{ marginBottom: '0.5rem' }}>Content unavailable offline</h2>
      <p
        style={{
          color: 'var(--cds-text-secondary, #525252)',
          maxWidth: '28rem',
        }}
      >
        This page requires a network connection and has not been saved for offline use. Please check
        your connection and try again.
      </p>
      <Button
        kind="ghost"
        style={{ marginTop: '1.5rem' }}
        onClick={() => {
          globalThis.location.reload();
        }}
      >
        Retry
      </Button>
    </div>
  );
};
