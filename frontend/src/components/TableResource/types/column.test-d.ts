/**
 * MonoBlocks — components/TableResource/types/column.test-d.ts
 *
 * Compile-time matrix for `TableResourceColumn`: positive shapes must type,
 * negative shapes are pinned with `@ts-expect-error` (an unused directive
 * fails `tsc -b`). Never executed by vitest.
 */
import { createElement } from 'react';
import { expectTypeOf } from 'vitest';

import type { TableResourceColumn } from './column';

interface Row {
  id: string;
  name: string;
  qty: number;
  status: string;
  when: Date;
}

// ── Positive cases ───────────────────────────────────────────────────────

export const _minimal: TableResourceColumn<Row> = { key: 'name', header: 'Name' };
expectTypeOf(_minimal.key).toEqualTypeOf<keyof Row>();

export const _withRender: TableResourceColumn<Row> = {
  key: 'name',
  header: 'Name',
  render: (row, index) => {
    expectTypeOf(row).toEqualTypeOf<Row>();
    expectTypeOf(index).toEqualTypeOf<number>();
    return row.name;
  },
};

export const _elementHeader: TableResourceColumn<Row> = {
  key: 'name',
  header: createElement('span', null, 'Name'),
};

export const _iterableHeader: TableResourceColumn<Row> = { key: 'name', header: ['Na', 'me'] };

export const _accessor: TableResourceColumn<Row> = {
  key: 'qty',
  header: 'Qty',
  accessor: (row) => row.qty * 2,
};

export const _sortable: TableResourceColumn<Row> = {
  key: 'name',
  header: 'Name',
  sortKey: 'name',
  className: 'cds--mono',
  align: 'right',
  editable: true,
};

export const _date: TableResourceColumn<Row> = {
  key: 'when',
  header: 'When',
  type: 'date',
  options: { format: 'YYYY-MM-DD' },
};

export const _number: TableResourceColumn<Row> = {
  key: 'qty',
  header: 'Qty',
  type: 'number',
  options: { decimalPlaces: 2, locale: 'en-US' },
};

export const _textTyped: TableResourceColumn<Row> = {
  key: 'name',
  header: 'Name',
  type: 'text',
  options: { trim: true },
};

export const _boolean: TableResourceColumn<Row> = {
  key: 'status',
  header: 'Status',
  type: 'boolean',
  options: { trueLabel: 'Open', falseLabel: 'Closed' },
};

// ── Negative cases (each @ts-expect-error must fire) ─────────────────────

// @ts-expect-error — `key` must be a key of Row
export const _badKey: TableResourceColumn<Row> = { key: 'nope', header: 'Name' };

// @ts-expect-error — `header` is required
export const _missingHeader: TableResourceColumn<Row> = { key: 'name' };

// @ts-expect-error — date columns require `options` (format is required)
export const _dateWithoutOptions: TableResourceColumn<Row> = {
  key: 'when',
  header: 'When',
  type: 'date',
};

export const _unknownType: TableResourceColumn<Row> = {
  key: 'status',
  header: 'Status',
  // @ts-expect-error — unknown type names are not in ColumnTypeMap
  type: 'nope',
};

// @ts-expect-error — date options need a `format` field (reported at the declaration)
export const _dateBadOptions: TableResourceColumn<Row> = {
  key: 'when',
  header: 'When',
  type: 'date',
  options: {},
};

// @ts-expect-error — `options` without a non-text `type` is not accepted (reported at the declaration)
export const _optionsWithoutType: TableResourceColumn<Row> = {
  key: 'qty',
  header: 'Qty',
  options: { decimalPlaces: 2 },
};

export const _badAlign: TableResourceColumn<Row> = {
  key: 'name',
  header: 'Name',
  // @ts-expect-error — `align` only accepts left/center/right
  align: 'middle',
};

// @ts-expect-error — `sortKey` is a string, not a boolean
export const _badSortKey: TableResourceColumn<Row> = { key: 'name', header: 'Name', sortKey: true };

export const _renderVoid: TableResourceColumn<Row> = {
  key: 'name',
  header: 'Name',
  // @ts-expect-error — `render` must return ReactNode, not a plain object
  render: () => ({ not: 'a node' }),
};
