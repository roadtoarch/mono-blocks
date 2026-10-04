/**
 * MonoBlocks — components/TableResource/TableResourceView.tsx
 *
 * The new typed table assembly: Carbon chrome (container, toolbar, zebra
 * table), a header row in every view state, and a body that switches between
 * data rows and the four state rows via `deriveViewState`. Toolbar and
 * headers render in ALL states; cell content follows the render → type →
 * text precedence. Chunks 4–9 wire single-column sorting (asc → desc →
 * cleared, reported via `sorting.onChange`, with `sorting.sort` mirroring an
 * external control back onto the header state), the Carbon pager below the
 * table (reported via `pagination.onChange`), config-gated column
 * visibility/order (the "Edit columns" menu, persisted under `persistKey`),
 * config-gated row expansion (a leading spacer column plus one
 * `ExpandableRowRenderer` pair per row, only while `expansion` is set),
 * config-gated row actions (a trailing "Actions" header plus one
 * `RowActionsRenderer` cell per row, only while `actions` is set), and
 * config-gated inline editing (an in-cell `EditableCellRenderer` on
 * `editable` columns, reported via `editing.onSave`); the table never
 * reorders, slices, or mutates `rows` itself. The barrel `index.tsx`
 * re-exports this component as `TableResource` (the chunk-10 flip).
 */
import {
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableExpandHeader,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
} from '@carbon/react';
import { functionalUpdate, useTable } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';

import {
  isColumnVisible,
  loadColumnPreferences,
  orderColumns,
  saveColumnPreferences,
} from './columnPreferences';
import { EditableCellRenderer } from './EditableCellRenderer';
import { ExpandableRowRenderer } from './ExpandableRowRenderer';
import { tableResourceFeatures } from './features';
import { useCellEditing } from './hooks/useCellEditing';
import { renderCell } from './renderCell';
import { RowActionsRenderer } from './RowActionsRenderer';
import { TableResourceColumnMenu } from './TableResourceColumnMenu';
import { TableResourceEmptyState } from './TableResourceEmptyState';
import { TableResourceErrorState } from './TableResourceErrorState';
import { TableResourceInitialState } from './TableResourceInitialState';
import { TableResourceLoadingState } from './TableResourceLoadingState';
import { toColumnDef } from './toColumnDef';
import { useColumnTypeRegistry } from './useColumnTypeRegistry';
import { assertNever, deriveViewState } from './viewState';

import type {
  TableResourceColumn,
  TableResourceColumnOrder,
  TableResourceColumnVisibility,
  TableResourceProps,
  TableResourceSortChange,
} from './types';
import type { RowData, SortingState } from '@tanstack/react-table';
import type { ReactElement } from 'react';

/** Carbon's sort-state vocabulary for a column header. */
type HeaderSortState = 'NONE' | 'DESC' | 'ASC';

/** Maps TanStack's sort direction to Carbon's header sort state. */
function toHeaderSortState(sorted: false | 'asc' | 'desc'): HeaderSortState {
  if (sorted === 'asc') return 'ASC';
  if (sorted === 'desc') return 'DESC';
  return 'NONE';
}

/**
 * Builds the consumer-facing sort report for a column, or `null` when the
 * toggle cleared sorting. The reported key is the column's `sortKey`, falling
 * back to its identity key.
 */
function toSortChange<TRow extends RowData>(
  column: TableResourceColumn<TRow>,
  sorted: false | 'asc' | 'desc',
): TableResourceSortChange | null {
  if (sorted === false) return null;
  return {
    key: column.sortKey ?? String(column.key),
    direction: sorted === 'desc' ? 'DESC' : 'ASC',
  };
}

/**
 * Controlled mode: maps the consumer's current sort back onto TanStack's
 * sorting slice so header arrows track an external control. The reported key
 * is `sortKey ?? key`, so the inverse match walks the same expression; a key
 * no column claims yields an empty slice (no header lit).
 */
function toControlledSorting<TRow extends RowData>(
  columns: readonly TableResourceColumn<TRow>[],
  sort: TableResourceSortChange | null,
): SortingState {
  if (sort === null) return [];
  const match = columns.find((column) => (column.sortKey ?? String(column.key)) === sort.key);
  return match === undefined ? [] : [{ id: String(match.key), desc: sort.direction === 'DESC' }];
}

/**
 * Page-size choices offered by the pager: Carbon's 10/20/30 trio plus the
 * configured size, so the controlled `pageSize` always has a matching option.
 */
function toPageSizes(pageSize: number | undefined): number[] {
  return [...new Set([10, 20, 30, pageSize ?? 10])].sort((a, b) => a - b);
}

/** Typed, config-opt-in table. Chunks 3–9: structure, states, toolbar, sorting, pagination, column visibility/order, row expansion, row actions, inline cell editing. */
export function TableResourceView<TRow extends RowData>({
  columns,
  rows,
  getRowId,
  status,
  isRefetching,
  className,
  toolbar,
  hasActiveFilters,
  skeletonRowCount,
  emptyState,
  error,
  onRetry,
  pagination,
  sorting,
  expansion,
  editing,
  actions,
  initialState,
  persistKey,
  columnMenu,
  columnVisibility,
  columnOrder,
}: TableResourceProps<TRow>): ReactElement {
  const registry = useColumnTypeRegistry();
  const cellEditing = useCellEditing(editing?.onSave);
  // Hydration is synchronous so the first paint already reflects stored
  // preferences and the persistence effect can never clobber them.
  const [storedPreferences] = useState(() => loadColumnPreferences(persistKey));
  const [internalVisibility, setInternalVisibility] = useState<TableResourceColumnVisibility>(
    () => storedPreferences.visibility ?? initialState?.columnVisibility ?? {},
  );
  const [internalOrder, setInternalOrder] = useState<TableResourceColumnOrder>(
    () => storedPreferences.order ?? initialState?.columnOrder ?? [],
  );
  // Effective slices: controlled prop > persisted > initial state > default.
  const visibility = columnVisibility ?? internalVisibility;
  const columnOrderList = columnOrder ?? internalOrder;
  const columnKeys = useMemo(() => columns.map((column) => String(column.key)), [columns]);
  const orderedColumns = useMemo(
    () => orderColumns(columns, columnOrderList),
    [columns, columnOrderList],
  );
  const displayColumns = useMemo(
    () => orderedColumns.filter((column) => isColumnVisible(visibility, String(column.key))),
    [orderedColumns, visibility],
  );
  const columnMenuEnabled =
    persistKey !== undefined ||
    columnVisibility !== undefined ||
    columnOrder !== undefined ||
    initialState?.columnVisibility !== undefined ||
    initialState?.columnOrder !== undefined;

  const handleToggleColumn = (key: string): void => {
    setInternalVisibility((previous) => {
      if (isColumnVisible(previous, key)) {
        return { ...previous, [key]: false };
      }
      // Show = drop the explicit `false` (absent means visible).
      return Object.fromEntries(Object.entries(previous).filter(([entryKey]) => entryKey !== key));
    });
  };

  const handleMoveColumn = (key: string, direction: -1 | 1): void => {
    const keys = orderedColumns.map((column) => String(column.key));
    const from = keys.indexOf(key);
    const to = from + direction;
    if (from === -1 || to < 0 || to >= keys.length) return;
    const moved = [...keys];
    moved.splice(from, 1);
    moved.splice(to, 0, key);
    setInternalOrder(moved);
  };

  useEffect(() => {
    if (persistKey === undefined) return;
    saveColumnPreferences(persistKey, visibility, columnOrderList, columnKeys);
  }, [persistKey, visibility, columnOrderList, columnKeys]);

  const table = useTable({
    features: tableResourceFeatures,
    data: rows,
    columns: columns.map((column) => toColumnDef(column)),
    getRowId,
    // Expansion is config-gated: rows carry no subRows, so the only thing
    // that unlocks a toggle is the consumer's render function (it also
    // guards `row.toggleExpanded`, which silently no-ops otherwise).
    getRowCanExpand: () => expansion !== undefined,
    // Sorting is reported, never applied: the consumer owns the ordered rows.
    manualSorting: true,
    enableSorting: sorting?.enabled === true,
    // Single column, deterministic asc → desc → cleared cycle.
    enableMultiSort: false,
    enableSortingRemoval: true,
    sortDescFirst: false,
    // Visibility/order are externally owned: the state option syncs each
    // slice into the table (so getVisibleLeafColumns matches our filter),
    // and the change handlers write back into our React state. Controlled
    // sorting joins the same object: when `sorting.sort` is present (even
    // null) TanStack mirrors it into header state; absent → internal toggles.
    state: {
      columnVisibility: visibility,
      columnOrder: columnOrderList,
      ...(sorting?.sort !== undefined
        ? { sorting: toControlledSorting(columns, sorting.sort) }
        : {}),
    },
    onColumnVisibilityChange: (updater) => {
      setInternalVisibility((previous) => functionalUpdate(updater, previous));
    },
    onColumnOrderChange: (updater) => {
      setInternalOrder((previous) => functionalUpdate(updater, previous));
    },
  });
  const view = deriveViewState(status, rows.length);
  // Expansion joins this count with a leading +1 spacer, actions with a
  // trailing +1.
  const colSpan =
    table.getVisibleLeafColumns().length +
    (expansion !== undefined ? 1 : 0) +
    (actions !== undefined ? 1 : 0);

  let body: ReactElement;
  switch (view.kind) {
    case 'data':
      body = (
        <>
          {rows.map((row, rowIndex) => {
            const rowId = getRowId(row, rowIndex);
            const cells = displayColumns.map((column) => {
              const key = column.key;
              const isTarget =
                cellEditing.target !== null &&
                cellEditing.target.rowId === rowId &&
                cellEditing.target.key === key;
              const editable = editing !== undefined && column.editable === true && !isTarget;
              const current = 'accessor' in column ? column.accessor(row) : row[key];
              const handleOpen = (): void => {
                cellEditing.openCell(rowId, key);
              };
              return (
                <TableCell
                  key={String(key)}
                  className={column.className}
                  style={column.align ? { textAlign: column.align } : undefined}
                  onClick={editable ? handleOpen : undefined}
                  onKeyDown={
                    editable
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleOpen();
                          }
                        }
                      : undefined
                  }
                  tabIndex={editable ? 0 : undefined}
                >
                  {isTarget ? (
                    <EditableCellRenderer
                      labelText={`Edit ${typeof column.header === 'string' ? column.header : String(key)}`}
                      value={current}
                      pending={cellEditing.pendingRowId === rowId}
                      error={cellEditing.error}
                      onCommit={(text) => {
                        cellEditing.commitEdit(rowId, key, current, text);
                      }}
                      onCancel={() => {
                        cellEditing.cancelEdit();
                      }}
                    />
                  ) : (
                    renderCell(column, row, rowIndex, registry)
                  )}
                </TableCell>
              );
            });
            const actionsCell =
              actions !== undefined ? (
                <RowActionsRenderer row={row} actions={actions.items(row)} />
              ) : null;
            if (expansion === undefined) {
              return (
                <TableRow key={rowId}>
                  {cells}
                  {actionsCell}
                </TableRow>
              );
            }
            const tableRow = table.getRow(rowId);
            const isExpanded = tableRow.getIsExpanded();
            return (
              <ExpandableRowRenderer
                key={rowId}
                ariaLabel={expansion.ariaLabel}
                colSpan={colSpan}
                content={isExpanded ? expansion.render(row, rowIndex) : null}
                isExpanded={isExpanded}
                onExpand={() => {
                  tableRow.toggleExpanded();
                }}
              >
                {cells}
                {actionsCell}
              </ExpandableRowRenderer>
            );
          })}
        </>
      );
      break;
    case 'initial':
      body = <TableResourceInitialState colSpan={colSpan} />;
      break;
    case 'loading':
      body = (
        <TableResourceLoadingState
          colSpan={colSpan}
          skeletonRowCount={skeletonRowCount}
          pageSize={pagination?.pageSize}
        />
      );
      break;
    case 'error':
      body = <TableResourceErrorState colSpan={colSpan} error={error} onRetry={onRetry} />;
      break;
    case 'empty':
      body = (
        <TableResourceEmptyState
          colSpan={colSpan}
          hasActiveFilters={hasActiveFilters}
          emptyState={emptyState}
        />
      );
      break;
    default:
      body = assertNever(view);
  }

  // Busy = whole-body skeleton (first load) or a keep-previous-data refetch.
  const isBusy = status === 'loading' || isRefetching === true;

  return (
    <TableContainer
      className={`mb-table-resource${className === undefined ? '' : ` ${className}`}`}
    >
      {isRefetching === true && status !== 'loading' ? (
        <div className="mb-table-resource__fetching-rule" aria-hidden="true" />
      ) : null}
      {toolbar || columnMenuEnabled ? (
        <TableToolbar>
          <TableToolbarContent>
            {toolbar}
            {columnMenuEnabled && columns.length > 1 ? (
              <TableResourceColumnMenu
                columns={orderedColumns}
                visibility={visibility}
                onToggle={handleToggleColumn}
                onMove={handleMoveColumn}
                config={columnMenu}
              />
            ) : null}
          </TableToolbarContent>
        </TableToolbar>
      ) : null}
      <span className="cds--visually-hidden" role="status">
        {isBusy
          ? pagination?.page === undefined
            ? 'Loading…'
            : `Loading page ${String(pagination.page)}…`
          : ''}
      </span>
      <Table useZebraStyles aria-busy={isBusy}>
        <TableHead>
          <TableRow>
            {expansion !== undefined ? <TableExpandHeader /> : null}
            {displayColumns.map((column) => {
              const columnId = String(column.key);
              const tanColumn = table.getColumn(columnId);
              const sorted = tanColumn?.getIsSorted() ?? false;
              const canSort = tanColumn?.getCanSort() === true;

              return (
                <TableHeader
                  key={columnId}
                  isSortable={canSort}
                  isSortHeader={canSort && sorted !== false}
                  sortDirection={toHeaderSortState(sorted)}
                  onClick={
                    canSort
                      ? () => {
                          if (sorting?.sort !== undefined) {
                            // Controlled: cycle from the echoed value (asc →
                            // desc → cleared → asc) and report; the arrow
                            // moves once the parent writes it back through
                            // `sorting.sort`.
                            const sort = sorting.sort;
                            const current: false | 'asc' | 'desc' =
                              sort !== null && sort.key === (column.sortKey ?? columnId)
                                ? sort.direction === 'DESC'
                                  ? 'desc'
                                  : 'asc'
                                : false;
                            const next =
                              current === 'asc' ? 'desc' : current === 'desc' ? false : 'asc';
                            sorting.onChange?.(toSortChange(column, next));
                            return;
                          }
                          tanColumn.toggleSorting();
                          sorting?.onChange?.(toSortChange(column, tanColumn.getIsSorted()));
                        }
                      : undefined
                  }
                >
                  {column.header}
                </TableHeader>
              );
            })}
            {actions !== undefined ? (
              <TableHeader>{actions.header === undefined ? 'Actions' : actions.header}</TableHeader>
            ) : null}
          </TableRow>
        </TableHead>
        <TableBody>{body}</TableBody>
      </Table>
      {pagination ? (
        <Pagination
          className="tb-resource-pg"
          data-testid="pagination"
          page={pagination.page ?? 1}
          pageSize={pagination.pageSize ?? 10}
          pageSizes={toPageSizes(pagination.pageSize)}
          totalItems={pagination.totalItems}
          pagesUnknown={pagination.totalItems === undefined}
          onChange={({ page, pageSize }) => {
            pagination.onChange?.(page, pageSize);
          }}
        />
      ) : null}
    </TableContainer>
  );
}
