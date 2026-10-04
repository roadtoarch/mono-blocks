/**
 * MonoBlocks — components/TableResource/TableResourceColumnMenu.tsx
 *
 * Chunk 6: the config-gated "Edit columns" toolbar menu (legacy parity with
 * nr-waste-plus's ColumnCustomizationMenu). One checkbox per column toggles
 * visibility; move up/down buttons reorder — the user's chosen stand-in for
 * drag and drop (no new dependency). The legacy class hooks are kept so the
 * copied artifact picks up nr-waste-plus styles.
 */
import { Checkbox, IconButton, TableToolbarMenu } from '@carbon/react';
import { ArrowDown, ArrowUp } from '@carbon/react/icons';

import { isColumnVisible } from './columnPreferences';

import type { TableResourceColumn, TableResourceColumnVisibility } from './types';
import type { RowData } from '@tanstack/react-table';
import type { CSSProperties, ReactElement } from 'react';

/** One menu row: checkbox plus the two reorder buttons. */
const itemStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.25rem' };

export interface TableResourceColumnMenuProps<TRow extends RowData> {
  /** All columns in current display order, including hidden ones. */
  columns: readonly TableResourceColumn<TRow>[];
  /** Effective visibility (explicit `false` entries are hidden). */
  visibility: TableResourceColumnVisibility;
  /** Toggles one column's visibility. */
  onToggle: (key: string) => void;
  /** Moves one column by −1 (up) or +1 (down) in the order list. */
  onMove: (key: string, direction: -1 | 1) => void;
}

export function TableResourceColumnMenu<TRow extends RowData>({
  columns,
  visibility,
  onToggle,
  onMove,
}: TableResourceColumnMenuProps<TRow>): ReactElement {
  return (
    <TableToolbarMenu
      iconDescription="Edit columns"
      className="table-action-menu-button column-menu-button"
      menuOptionsClass="table-search-action-menu-option"
    >
      <div className="helper-text">Select the columns you want to see</div>
      {columns.map((column, index) => {
        const key = String(column.key);
        const label = typeof column.header === 'string' ? column.header : key;
        return (
          <div key={key} className="table-action-menu-option-item" style={itemStyle}>
            <Checkbox
              id={`mb-col-${key}`}
              aria-label={`Toggle ${label} column`}
              labelText={label}
              checked={isColumnVisible(visibility, key)}
              onChange={() => {
                onToggle(key);
              }}
            />
            <IconButton
              label={`Move ${label} up`}
              kind="ghost"
              size="sm"
              disabled={index === 0}
              onClick={() => {
                onMove(key, -1);
              }}
            >
              <ArrowUp />
            </IconButton>
            <IconButton
              label={`Move ${label} down`}
              kind="ghost"
              size="sm"
              disabled={index === columns.length - 1}
              onClick={() => {
                onMove(key, 1);
              }}
            >
              <ArrowDown />
            </IconButton>
          </div>
        );
      })}
    </TableToolbarMenu>
  );
}
