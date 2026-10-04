/**
 * MonoBlocks — components/TableResource/renderCell.unit.test.ts
 *
 * Cell precedence matrix: render(row) → type renderer → text, null → '—',
 * registry-miss fallback to text, and the augmented `testonly` type (declared
 * by registry.unit.test.tsx in this vitest program).
 */
import { builtinColumnTypes } from './registry';
import { renderCell } from './renderCell';

import type { ColumnTypeRegistry, TableResourceColumn } from './types';

interface Row {
  id: string;
  name: string;
  qty: number;
  when: string | null;
}

const row: Row = { id: 'r1', name: 'Alpha', qty: 1234.5, when: null };
const registry: ColumnTypeRegistry = { ...builtinColumnTypes };

describe('renderCell', () => {
  it('prefers render(row) over the type renderer', () => {
    const column: TableResourceColumn<Row> = {
      key: 'qty',
      header: 'Qty',
      type: 'number',
      options: { decimalPlaces: 2 },
      render: (r, index) => `custom:${r.name}#${String(index)}`,
    };
    expect(renderCell(column, row, 3, registry)).toBe('custom:Alpha#3');
  });

  it('uses the type renderer when render is absent', () => {
    const column: TableResourceColumn<Row> = {
      key: 'qty',
      header: 'Qty',
      type: 'number',
      options: { locale: 'en-US', decimalPlaces: 2 },
    };
    expect(renderCell(column, row, 0, registry)).toBe('1,234.50');
  });

  it('falls back to text without render or type', () => {
    const column: TableResourceColumn<Row> = { key: 'name', header: 'Name' };
    expect(renderCell(column, row, 0, registry)).toBe('Alpha');
    const qtyColumn: TableResourceColumn<Row> = { key: 'qty', header: 'Qty' };
    expect(renderCell(qtyColumn, row, 0, registry)).toBe('1234.5');
  });

  it('renders nullish values as an em dash before any renderer', () => {
    const column: TableResourceColumn<Row> = {
      key: 'when',
      header: 'When',
      type: 'date',
      options: { format: 'YYYY' },
    };
    expect(renderCell(column, row, 0, registry)).toBe('—');
  });

  it('uses the accessor value for accessor columns', () => {
    const column: TableResourceColumn<Row> = {
      key: 'qty',
      header: 'Qty',
      accessor: (r) => r.qty * 2,
    };
    expect(renderCell(column, row, 0, registry)).toBe('2469');
  });

  it('dispatches augmented types through the registry with options', () => {
    const column: TableResourceColumn<Row> = {
      key: 'name',
      header: 'Name',
      type: 'testonly',
      options: { prefix: 'T:' },
    };
    const withTestOnly: ColumnTypeRegistry = {
      ...registry,
      testonly: { render: (value, options) => `${options.prefix ?? '?'}${String(value)}` },
    };
    expect(renderCell(column, row, 0, withTestOnly)).toBe('T:Alpha');
  });

  it('falls back to text when a registration is missing', () => {
    const column: TableResourceColumn<Row> = {
      key: 'name',
      header: 'Name',
      type: 'testonly',
    };
    expect(renderCell(column, row, 0, registry)).toBe('Alpha');
  });
});
