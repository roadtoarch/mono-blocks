/**
 * MonoBlocks — components/TableResource/TableResourceErrorState.tsx
 *
 * Body row shown when `status === 'error'`: the parent's error message (or a
 * generic fallback) plus an optional Retry button wired to `onRetry`.
 */
import { Button, TableCell, TableRow } from '@carbon/react';

import type { ReactElement, ReactNode } from 'react';

/** Props for {@link TableResourceErrorState}. */
export interface TableResourceErrorStateProps {
  /** Number of table columns the message must span (visible leaf + expand + actions). */
  colSpan: number;
  /** Error detail from the parent; a generic fallback is used when absent. */
  error?: ReactNode;
  /** When provided, renders a Retry button that invokes it. */
  onRetry?: () => void;
}

/** Single-row body state rendered after a failed fetch. */
export function TableResourceErrorState({
  colSpan,
  error,
  onRetry,
}: TableResourceErrorStateProps): ReactElement {
  const message = error === undefined ? 'Something went wrong.' : error;
  return (
    <TableRow>
      <TableCell colSpan={colSpan}>
        {message}
        {onRetry ? <Button onClick={onRetry}>Retry</Button> : null}
      </TableCell>
    </TableRow>
  );
}
