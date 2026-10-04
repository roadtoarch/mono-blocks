/**
 * MonoBlocks — components/TableResource/TableResourceEmptyState.tsx
 *
 * Body row shown when `status === 'success'` but there are no rows. The
 * default message distinguishes "filters excluded everything" from "there is
 * nothing at all"; an explicit `emptyState` node overrides both.
 */
import { TableCell, TableRow } from '@carbon/react';

import type { ReactElement, ReactNode } from 'react';

/** Props for {@link TableResourceEmptyState}. */
export interface TableResourceEmptyStateProps {
  /** Number of table columns the message must span (visible leaf + expand + actions). */
  colSpan: number;
  /** Renders the filtered-no-results copy when true. */
  hasActiveFilters?: boolean;
  /** Custom replacement for the default message (rendered verbatim, including `null`). */
  emptyState?: ReactNode;
}

/** Single-row body state rendered for a successful fetch with zero rows. */
export function TableResourceEmptyState({
  colSpan,
  hasActiveFilters = false,
  emptyState,
}: TableResourceEmptyStateProps): ReactElement {
  const message =
    emptyState === undefined
      ? hasActiveFilters
        ? 'No results match the current filters.'
        : 'No data available.'
      : emptyState;
  return (
    <TableRow>
      <TableCell colSpan={colSpan}>{message}</TableCell>
    </TableRow>
  );
}
