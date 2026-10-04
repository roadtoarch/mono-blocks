/**
 * MonoBlocks — components/TableResource/toColumnDef.unit.test.ts
 *
 * Runtime tests for the TanStack adapter: identity, accessor wiring, the
 * sorting flag, and proof that our own metadata never leaks into the
 * `ColumnDef`.
 */
import { toColumnDef } from './toColumnDef';

import type { TableResourceColumn } from './types';

interface Row {
  id: string;
  name: string;
  qty: number;
}

describe('toColumnDef', () => {
  it('builds a plain key column with id, accessorKey, and sorting off', () => {
    const plain: TableResourceColumn<Row> = { key: 'name', header: 'Name' };
    const def = toColumnDef<Row>(plain);
    expect(def).toMatchObject({ id: 'name', accessorKey: 'name', enableSorting: false });
  });

  it('enables sorting only when sortKey is present', () => {
    expect(toColumnDef<Row>({ key: 'name', header: 'Name' })).toMatchObject({
      enableSorting: false,
    });
    expect(toColumnDef<Row>({ key: 'qty', header: 'Qty', sortKey: 'quantity' })).toMatchObject({
      enableSorting: true,
    });
  });

  it('wraps a custom accessor into accessorFn', () => {
    const def = toColumnDef<Row>({
      key: 'name',
      header: 'Name',
      accessor: (row) => row.name.toUpperCase(),
    });
    expect('accessorFn' in def).toBe(true);
    const fn = 'accessorFn' in def ? def.accessorFn : undefined;
    expect(fn?.({ id: '1', name: 'abc', qty: 2 }, 0)).toBe('ABC');
  });

  it('keeps our own metadata out of the ColumnDef', () => {
    const def = toColumnDef<Row>({
      key: 'qty',
      header: 'Qty',
      type: 'number',
      options: { decimalPlaces: 2 },
      sortKey: 'qty',
      editable: true,
      align: 'right',
      className: 'cds--mono',
    });
    expect(def).not.toHaveProperty('header');
    expect(def).not.toHaveProperty('options');
    expect(def).not.toHaveProperty('type');
    expect(def).not.toHaveProperty('sortKey');
    expect(def).not.toHaveProperty('editable');
    expect(def).not.toHaveProperty('align');
    expect(def).not.toHaveProperty('className');
  });
});
