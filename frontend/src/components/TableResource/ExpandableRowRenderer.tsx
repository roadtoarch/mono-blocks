/**
 * MonoBlocks — components/TableResource/ExpandableRowRenderer.tsx
 *
 * Chunk 7: one expandable data-row pair — Carbon's `TableExpandRow` (summary
 * cells + expand/collapse control) plus the conditional `TableExpandedRow`
 * panel. Mirrors nr-waste-plus's TableResourceExpandRow, except the panel
 * renders only while expanded and takes synchronous content (the approved
 * `expansion.render` callback) instead of an async skeleton placeholder.
 */
import { TableExpandRow, TableExpandedRow } from '@carbon/react';

import type { ReactElement, ReactNode } from 'react';

export interface ExpandableRowRendererProps {
  /** Summary-row cells (the visible column cells). */
  children: ReactNode;
  /** Accessible name for the expand/collapse control. */
  ariaLabel: string;
  /** Visible columns + 1 (the expand control column). */
  colSpan: number;
  /** Expanded panel content; rendered only while `isExpanded`. */
  content: ReactNode;
  /** Whether this row's panel is open. */
  isExpanded: boolean;
  /** Toggles the panel. */
  onExpand: () => void;
}

export function ExpandableRowRenderer({
  children,
  ariaLabel,
  colSpan,
  content,
  isExpanded,
  onExpand,
}: ExpandableRowRendererProps): ReactElement {
  return (
    <>
      <TableExpandRow aria-label={ariaLabel} isExpanded={isExpanded} onExpand={onExpand}>
        {children}
      </TableExpandRow>
      {isExpanded ? <TableExpandedRow colSpan={colSpan}>{content}</TableExpandedRow> : null}
    </>
  );
}
