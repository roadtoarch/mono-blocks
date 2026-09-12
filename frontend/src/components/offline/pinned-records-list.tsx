/**
 * Pinned records list — settings-style list of pinned records grouped
 * by entity type, with an unpin action per record.
 *
 * Rendered inside the profile {@link HeaderPanel} when the user has
 * the `OFFLINE_ALLOWED` role (OQ-7).
 *
 * @module components/offline/pinned-records-list
 */

import { PinFilled } from '@carbon/icons-react';
import {
  IconButton,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
} from '@carbon/react';
import { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';

import type { PinnedRecord } from '@/db/types';
import type { FC } from 'react';

import { pinAdapter } from '@/offline/pin-adapter';
import { useOfflineAllowed } from '@/offline/use-offline-allowed';

/**
 * Formats a byte count into a human-readable string (KiB / MiB).
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '—';
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
};

/**
 * Groups pinned records by their `contentType` field.
 */
const groupByType = (records: readonly PinnedRecord[]): Map<string, PinnedRecord[]> => {
  const groups = new Map<string, PinnedRecord[]>();
  for (const record of records) {
    const existing = groups.get(record.contentType);
    if (existing) {
      existing.push(record);
    } else {
      groups.set(record.contentType, [record]);
    }
  }
  return groups;
};

/**
 * Capitalises the first letter of an entity type for display.
 */
const formatEntityType = (type: string): string => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};

/**
 * Settings-style list of the user's pinned records, grouped by
 * entity type with an unpin action per record.
 *
 * Returns `null` if the user does not have the `OFFLINE_ALLOWED`
 * role or has no pinned records.
 *
 * @example
 * ```tsx
 * <PinnedRecordsList />
 * ```
 */
export const PinnedRecordsList: FC = () => {
  const offlineAllowed = useOfflineAllowed();
  const auth = useAuth();
  const userId = auth.user?.profile.sub;

  const [records, setRecords] = useState<PinnedRecord[]>([]);

  useEffect(() => {
    if (!offlineAllowed || !userId) {
      return;
    }

    pinAdapter
      .getAll(userId)
      .then(setRecords)
      .catch(() => {
        // Silently ignore — the list will be empty.
      });
  }, [offlineAllowed, userId]);

  if (!offlineAllowed || records.length === 0) {
    return null;
  }

  const groups = groupByType(records);

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <p
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          marginBottom: '0.25rem',
          color: 'var(--cds-text-secondary, #525252)',
        }}
      >
        Pinned for offline
      </p>
      <StructuredListWrapper selection>
        {Array.from(groups.entries()).map(([entityType, groupRecords]) => (
          <div key={entityType}>
            <StructuredListHead>
              <StructuredListRow head>
                <StructuredListCell head>
                  {formatEntityType(entityType)} ({groupRecords.length})
                </StructuredListCell>
                <StructuredListCell head>Size</StructuredListCell>
                <StructuredListCell head />
              </StructuredListRow>
            </StructuredListHead>
            <StructuredListBody>
              {groupRecords.map((record) => (
                <StructuredListRow key={`${record.contentType}-${record.contentId}`}>
                  <StructuredListCell>{record.contentId}</StructuredListCell>
                  <StructuredListCell>{formatBytes(record.estimatedSizeBytes)}</StructuredListCell>
                  <StructuredListCell>
                    <IconButton
                      kind="ghost"
                      size="sm"
                      label={`Unpin ${record.contentId}`}
                      align="left"
                      onClick={() => {
                        if (!userId) return;
                        void pinAdapter.unpin(userId, record.contentType, record.contentId);
                        setRecords((prev) =>
                          prev.filter(
                            (r) =>
                              !(
                                r.contentType === record.contentType &&
                                r.contentId === record.contentId
                              ),
                          ),
                        );
                      }}
                    >
                      <PinFilled size={16} />
                    </IconButton>
                  </StructuredListCell>
                </StructuredListRow>
              ))}
            </StructuredListBody>
          </div>
        ))}
      </StructuredListWrapper>
    </div>
  );
};
