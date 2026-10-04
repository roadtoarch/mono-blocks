/**
 * MonoBlocks — components/TableResource/TableResourceInitialState.tsx
 *
 * Body row shown when `status === 'initial'`: the parent has not fetched
 * anything yet, so the table says so instead of pretending it is empty.
 */
import { TableCell, TableRow } from '@carbon/react';

import type { ReactElement } from 'react';

/** Props for {@link TableResourceInitialState}. */
export interface TableResourceInitialStateProps {
  /** Number of table columns the message must span (visible leaf + expand + actions). */
  colSpan: number;
}

/** Single-row body state rendered before the first fetch. */
export function TableResourceInitialState({
  colSpan,
}: TableResourceInitialStateProps): ReactElement {
  return (
    <TableRow>
      <TableCell colSpan={colSpan}>Nothing to display yet.</TableCell>
    </TableRow>
  );
}
