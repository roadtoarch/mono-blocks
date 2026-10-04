/**
 * MonoBlocks — components/TableResource/toColumnDef.ts
 *
 * Adapts a `TableResourceColumn` to TanStack Table v9's `ColumnDef`.
 * Everything user-facing (header content, `render`, className, align,
 * editing) stays on our own column objects and is rendered by the Carbon
 * parts; TanStack only needs identity, an accessor, and the sorting flag.
 */
import type { tableResourceFeatures } from './features';
import type { TableResourceColumn } from './types';
import type { ColumnDef } from '@tanstack/react-table';
import type { RowData } from '@tanstack/react-table';

/**
 * Converts one typed column definition into a TanStack `ColumnDef` for the
 * TableResource feature set.
 */
export function toColumnDef<TRow extends RowData>(
  column: TableResourceColumn<TRow>,
): ColumnDef<typeof tableResourceFeatures, TRow> {
  const base = {
    id: String(column.key),
    enableSorting: column.sortKey !== undefined,
  };

  if ('accessor' in column) {
    // `as` deliberately avoided: the union narrows on `accessor` and the
    // accessor wrapper satisfies TanStack's AccessorFn shape directly.
    const { accessor } = column;
    return { ...base, accessorFn: (row: TRow) => accessor(row) };
  }

  // `key: keyof TRow` is exactly TanStack's `keyof TData` accessorKey form.
  return { ...base, accessorKey: column.key };
}
