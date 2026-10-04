/**
 * MonoBlocks — components/TableResource/renderCell.ts
 *
 * Cell-content precedence: `render(row)` wins, then the registered type
 * renderer, then plain text. Nullish values short-circuit to `'—'` before any
 * renderer sees them. Non-builtin (augmented) types keep their `type` and
 * `options` correlated through the union narrowing below — one branch per
 * builtin, then the augmented remainder.
 */
import type { ColumnTypeRegistry, TableResourceColumn } from './types';
import type { RowData } from '@tanstack/react-table';
import type { ReactNode } from 'react';

/** Plain-text fallback mirroring the builtin `text` renderer (no trim). */
function textFallback(value: unknown): string {
  return typeof value === 'string' ? value : String(value);
}

/**
 * Renders one cell's content for the given row. `registry` comes from
 * `useColumnTypeRegistry()`; a missing registration falls back to text.
 */
export function renderCell<TRow extends RowData>(
  column: TableResourceColumn<TRow>,
  row: TRow,
  index: number,
  registry: ColumnTypeRegistry,
): ReactNode {
  if (column.render !== undefined) {
    return column.render(row, index);
  }

  const value = 'accessor' in column ? column.accessor(row) : row[column.key];
  if (value === null || value === undefined) {
    return '—';
  }

  // Wide snapshot of `column.type` taken before the builtin branches below
  // narrow the property view; used for the aliased-discriminant check in the
  // augmented branch (locals never retroactively narrow).
  const declaredType = column.type;

  if (column.type === undefined || column.type === 'text') {
    const def = registry.text;
    if (def === undefined) return textFallback(value);
    return def.render(value, column.options ?? {});
  }
  if (column.type === 'number') {
    const def = registry.number;
    if (def === undefined) return textFallback(value);
    return def.render(value, column.options ?? {});
  }
  if (column.type === 'date') {
    const def = registry.date;
    if (def === undefined) return textFallback(value);
    // Date options are required by TypePart, so this is always defined.
    return def.render(value, column.options);
  }
  if (column.type === 'boolean') {
    const def = registry.boolean;
    if (def === undefined) return textFallback(value);
    return def.render(value, column.options ?? {});
  }

  // Augmented (non-builtin) type: `column.type` is narrowed to the remaining
  // keys of ColumnTypeMap, so the registry entry is already aligned. The
  // column object itself is not narrowed by the checks above (the optional
  // text member survives negated checks), so re-checking the pre-captured
  // wide `declaredType` against the narrowed key narrows the whole column
  // and keeps `options` correlated with `def`.
  const type = column.type;
  const def = registry[type];
  if (def === undefined) return textFallback(value);
  if (declaredType === type) {
    return def.render(value, column.options ?? {});
  }
  return textFallback(value);
}
