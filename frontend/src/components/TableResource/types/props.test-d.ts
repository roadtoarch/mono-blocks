/**
 * MonoBlocks — components/TableResource/types/props.test-d.ts
 *
 * Compile-time matrix for `TableResourceProps` and its configuration
 * objects. Never executed by vitest.
 */
import { expectTypeOf } from 'vitest';

import type { TableResourceColumn } from './column';
import type { TableResourceProps } from './config';

interface Row {
  id: string;
  name: string;
  qty: number;
}

const columns: TableResourceColumn<Row>[] = [{ key: 'name', header: 'Name' }];
const rows: Row[] = [{ id: 'r1', name: 'Alpha', qty: 1 }];
const getRowId = (row: Row): string => row.id;

const base: TableResourceProps<Row> = { columns, rows, getRowId, status: 'success' };

// ── Positive cases ───────────────────────────────────────────────────────

expectTypeOf(base.getRowId).toEqualTypeOf<(row: Row, index: number) => string>();

export const _full: TableResourceProps<Row> = {
  ...base,
  status: 'loading',
  isRefetching: true,
  error: 'Failed to load',
  onRetry: () => undefined,
  emptyState: 'Nothing here',
  initialState: { columnVisibility: { name: false }, columnOrder: ['qty', 'name'] },
  hasActiveFilters: true,
  skeletonRowCount: 5,
  toolbar: 'Toolbar',
  className: 'my-table',
  persistKey: 'users',
  sorting: {
    enabled: true,
    onChange: (sort) => {
      expectTypeOf(sort).toEqualTypeOf<{ key: string; direction: 'ASC' | 'DESC' } | null>();
    },
  },
  pagination: {
    page: 1,
    pageSize: 10,
    totalItems: 42,
    onChange: (page, pageSize) => {
      expectTypeOf(page).toEqualTypeOf<number>();
      expectTypeOf(pageSize).toEqualTypeOf<number>();
    },
  },
  expansion: {
    ariaLabel: 'Expand row',
    render: (row, index) => {
      expectTypeOf(row).toEqualTypeOf<Row>();
      expectTypeOf(index).toEqualTypeOf<number>();
      return row.name;
    },
  },
  editing: {
    onSave: (rowId, patch) => {
      expectTypeOf(rowId).toEqualTypeOf<string>();
      expectTypeOf(patch).toEqualTypeOf<Partial<Row>>();
      return Promise.resolve();
    },
  },
  actions: {
    header: 'Actions',
    items: (row) => {
      expectTypeOf(row).toEqualTypeOf<Row>();
      return [
        {
          id: 'edit',
          label: 'Edit',
          onClick: (target) => expectTypeOf(target).toEqualTypeOf<Row>(),
        },
        { id: 'del', label: 'Delete', icon: 'x', onClick: () => undefined, disabled: true },
      ];
    },
  },
  columnVisibility: { name: false },
  columnOrder: ['name', 'qty'],
};

// ── Negative cases (each @ts-expect-error must fire) ─────────────────────

// @ts-expect-error — `status` is required
export const _missingStatus: TableResourceProps<Row> = { columns, rows, getRowId };

// @ts-expect-error — status must be a known lifecycle value
export const _badStatus: TableResourceProps<Row> = { columns, rows, getRowId, status: 'nope' };

// @ts-expect-error — `getRowId` is required
export const _missingGetRowId: TableResourceProps<Row> = { columns, rows, status: 'success' };

export const _badRows: TableResourceProps<Row> = {
  columns,
  // @ts-expect-error — rows must match the row type
  rows: [{ wrong: true }],
  getRowId,
  status: 'success',
};

// @ts-expect-error — expansion.ariaLabel is required
export const _noAria: TableResourceProps<Row> = { ...base, expansion: { render: (r) => r.name } };

export const _badPatch: TableResourceProps<Row> = {
  ...base,
  editing: {
    // @ts-expect-error — onSave's patch must be Partial<Row>, not a foreign shape
    onSave: (rowId: string, patch: { other: string }) => {
      expectTypeOf(rowId).toEqualTypeOf<string>();
      expectTypeOf(patch.other).toEqualTypeOf<string>();
    },
  },
};

export const _actionWithoutLabel: TableResourceProps<Row> = {
  ...base,
  // @ts-expect-error — action items need a label
  actions: { items: () => [{ id: 'x', onClick: () => undefined }] },
};

// @ts-expect-error — skeletonRowCount is a number
export const _badSkeleton: TableResourceProps<Row> = { ...base, skeletonRowCount: '5' };
