/**
 * MonoBlocks — components/TableResource/TableResourceLoadingState.tsx
 *
 * Body row shown while `status === 'loading'`: one Carbon SkeletonText whose
 * line count is `skeletonRowCount ?? pageSize ?? 10`, so the shimmer roughly
 * matches the page the user is about to see.
 */
import { SkeletonText, TableCell, TableRow } from '@carbon/react';

import type { ReactElement } from 'react';

/** Props for {@link TableResourceLoadingState}. */
export interface TableResourceLoadingStateProps {
  /** Number of table columns the skeleton must span (visible leaf + expand + actions). */
  colSpan: number;
  /** Overrides the skeleton line count, bypassing `pageSize ?? 10`. */
  skeletonRowCount?: number;
  /** Pagination page size; used for the line count when `skeletonRowCount` is absent. */
  pageSize?: number;
}

/** Single-row body state rendered while the first fetch is in flight. */
export function TableResourceLoadingState({
  colSpan,
  skeletonRowCount,
  pageSize,
}: TableResourceLoadingStateProps): ReactElement {
  const lines = skeletonRowCount ?? pageSize ?? 10;
  return (
    <TableRow>
      <TableCell colSpan={colSpan}>
        <SkeletonText paragraph lineCount={lines} />
      </TableCell>
    </TableRow>
  );
}
