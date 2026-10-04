/**
 * MonoBlocks — components/TableResource/RowActionsRenderer.tsx
 *
 * Chunk 8: the trailing actions cell — one Carbon `OverflowMenu` per row
 * holding that row's actions. Legacy parity with nr-waste-plus's
 * TableResourceActions, except every action lands in the menu (the approved
 * config has no `maxInlineRowActions`, so there is no inline-button split)
 * and the cell renders only while the `actions` config is set.
 */
import { OverflowMenu, OverflowMenuItem, TableCell } from '@carbon/react';

import type { TableResourceAction } from './types';
import type { ReactElement } from 'react';

export interface RowActionsRendererProps<TRow> {
  /** The row these actions belong to (passed to each `onClick`). */
  row: TRow;
  /** Actions for this row, already resolved from the config's `items`. */
  actions: readonly TableResourceAction<TRow>[];
}

export function RowActionsRenderer<TRow>({
  row,
  actions,
}: RowActionsRendererProps<TRow>): ReactElement {
  return (
    <TableCell>
      {actions.length > 0 ? (
        // Carbon wires the trigger's accessible name from `iconDescription`
        // (default "Options"); `aria-label` names the floating menu list.
        <OverflowMenu aria-label="Row actions" iconDescription="Row actions" size="sm" flipped>
          {actions.map((action) => (
            <OverflowMenuItem
              key={action.id}
              // Carbon's overflow items have no icon slot; a leading icon
              // joins the label inside itemText (plain string otherwise so
              // Carbon keeps its default item markup).
              itemText={
                action.icon !== undefined ? (
                  <>
                    {action.icon}
                    {action.label}
                  </>
                ) : (
                  action.label
                )
              }
              disabled={action.disabled}
              onClick={() => {
                action.onClick(row);
              }}
            />
          ))}
        </OverflowMenu>
      ) : null}
    </TableCell>
  );
}
