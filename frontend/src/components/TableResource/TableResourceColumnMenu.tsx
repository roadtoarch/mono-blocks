/**
 * MonoBlocks — components/TableResource/TableResourceColumnMenu.tsx
 *
 * Chunk 6: the config-gated "Edit columns" toolbar menu (legacy parity with
 * nr-waste-plus's ColumnCustomizationMenu). One checkbox per column toggles
 * visibility; move up/down buttons reorder — the user's chosen stand-in for
 * drag and drop (no new dependency). Batch A3: the reorder group leads each
 * row (a stable control gutter before the label) and `config.display` swaps
 * the icon-only TableToolbarMenu for a labelled Carbon MenuButton. The
 * legacy class hooks are kept so the copied artifact picks up nr-waste-plus
 * styles.
 */
import { Checkbox, IconButton, MenuButton, TableToolbarMenu } from '@carbon/react';
import { ArrowDown, ArrowUp } from '@carbon/react/icons';

import { isColumnVisible } from './columnPreferences';

import type {
  TableResourceColumn,
  TableResourceColumnMenuConfig,
  TableResourceColumnVisibility,
} from './types';
import type { RowData } from '@tanstack/react-table';
import type { ReactElement, ReactNode } from 'react';

export interface TableResourceColumnMenuProps<TRow extends RowData> {
  /** All columns in current display order, including hidden ones. */
  columns: readonly TableResourceColumn<TRow>[];
  /** Effective visibility (explicit `false` entries are hidden). */
  visibility: TableResourceColumnVisibility;
  /** Toggles one column's visibility. */
  onToggle: (key: string) => void;
  /** Moves one column by −1 (up) or +1 (down) in the order list. */
  onMove: (key: string, direction: -1 | 1) => void;
  /** Trigger presentation (enablement stays derived by the view). */
  config?: TableResourceColumnMenuConfig;
}

export function TableResourceColumnMenu<TRow extends RowData>({
  columns,
  visibility,
  onToggle,
  onMove,
  config,
}: TableResourceColumnMenuProps<TRow>): ReactElement {
  const handleMove = (key: string, direction: -1 | 1, columnLabel: string): void => {
    onMove(key, direction);
    // Rows re-key on reorder; a button at the edge disables itself and the
    // browser drops focus to <body>. Restore it once the DOM has caught up:
    // the same-direction button when it still accepts input, else its sibling.
    queueMicrotask(() => {
      const group = document.querySelector(`[aria-label="Reorder ${columnLabel}"]`);
      const buttons = group?.querySelectorAll('button');
      if (buttons === undefined || buttons.length < 2) {
        return;
      }
      const target = direction === -1 ? 0 : 1;
      const fallback = direction === -1 ? 1 : 0;
      const preferred = buttons[target];
      const candidate = preferred.disabled ? buttons[fallback] : preferred;
      candidate.focus();
    });
  };

  // A plain array rather than one wrapping Fragment: the overflow toolbar
  // clones its children when the menu opens, and a cloned Fragment trips
  // React's "invalid prop on Fragment" dev warning — individual elements
  // absorb the clone safely.
  const body: ReactNode[] = [
    <div key="mb-col-helper" className="helper-text">
      Select the columns you want to see
    </div>,
    ...columns.map((column, index) => {
      const key = String(column.key);
      const label = typeof column.header === 'string' ? column.header : key;
      return (
        <div key={key} className="table-action-menu-option-item">
          <div
            className="table-action-menu-option-item__moves"
            role="group"
            aria-label={`Reorder ${label}`}
          >
            <IconButton
              id={`mb-col-move-up-${key}`}
              label={`Move ${label} up`}
              kind="ghost"
              size="sm"
              disabled={index === 0}
              onClick={() => {
                handleMove(key, -1, label);
              }}
            >
              <ArrowUp />
            </IconButton>
            <IconButton
              id={`mb-col-move-down-${key}`}
              label={`Move ${label} down`}
              kind="ghost"
              size="sm"
              disabled={index === columns.length - 1}
              onClick={() => {
                handleMove(key, 1, label);
              }}
            >
              <ArrowDown />
            </IconButton>
          </div>
          <div className="table-action-menu-option-item__label" title={label}>
            <Checkbox
              id={`mb-col-${key}`}
              aria-label={`Toggle ${label} column`}
              labelText={label}
              checked={isColumnVisible(visibility, key)}
              onChange={() => {
                onToggle(key);
              }}
            />
          </div>
        </div>
      );
    }),
  ];

  if (config?.display !== undefined && config.display !== 'icon-only') {
    const triggerLabel = config.label ?? 'Edit columns';
    return (
      <MenuButton
        label={triggerLabel}
        kind={config.kind ?? 'ghost'}
        size={config.size ?? 'sm'}
        menuAlignment="bottom-start"
        className={`mb-table-resource__menu-trigger${
          config.display === 'text-only' ? ' mb-table-resource__menu-trigger--text-only' : ''
        }`}
      >
        {body}
      </MenuButton>
    );
  }

  return (
    <TableToolbarMenu
      iconDescription={config?.label ?? 'Edit columns'}
      className="table-action-menu-button column-menu-button"
      menuOptionsClass="table-search-action-menu-option"
    >
      {body}
    </TableToolbarMenu>
  );
}
