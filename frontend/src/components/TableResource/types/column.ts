/**
 * MonoBlocks — components/TableResource/types/column.ts
 *
 * Column type layer. `ColumnTypeMap` is the augmentable registry contract:
 * its keys are the valid values of a column's `type` field and its values are
 * the per-type options objects columns may (or must) carry. Applications may
 * declaration-merge additional keys into `ColumnTypeMap`; every non-builtin
 * key must then be registered at runtime via `defineColumnTypes`.
 */
import type { ReactNode } from 'react';

/** Options for the builtin `text` column type. */
export interface TextColumnOptions {
  /** Trim surrounding whitespace from string values before display. */
  trim?: boolean;
}

/** Options for the builtin `number` column type. */
export interface NumberColumnOptions {
  /** Fixed number of fraction digits (defaults to the locale default). */
  decimalPlaces?: number;
  /** BCP 47 locale used for digit grouping, e.g. `'en-US'`. */
  locale?: string;
}

/** Options for the builtin `date` column type. */
export interface DateColumnOptions {
  /**
   * Display format using the tokens `YYYY`, `YY`, `MM`, `M`, `DD`, `D`,
   * `HH`, `H`, `mm`, `m`, `ss`, `s`. Required so date display is never
   * locale-implicit.
   */
  format: string;
}

/** Options for the builtin `boolean` column type. */
export interface BooleanColumnOptions {
  /** Label for truthy values (default `'Yes'`). */
  trueLabel?: string;
  /** Label for falsy values (default `'No'`). */
  falseLabel?: string;
}

/**
 * Augmentable map of column type name → options shape. Declaration-merge new
 * keys here to introduce custom column types; registration is then enforced
 * at every `defineColumnTypes` / provider call site.
 */
export interface ColumnTypeMap {
  text: TextColumnOptions;
  number: NumberColumnOptions;
  date: DateColumnOptions;
  boolean: BooleanColumnOptions;
}

/** Names of the built-in column types (never affected by augmentation). */
export type BuiltinColumnTypeName = 'text' | 'number' | 'date' | 'boolean';

/** Horizontal alignment applied to a column's body cells. */
export type TableResourceAlign = 'left' | 'center' | 'right';

/**
 * Properties shared by every column regardless of key, accessor, or type.
 */
export interface BaseColumn<TRow> {
  /** Header content rendered in the column header cell. */
  header: ReactNode;
  /**
   * Presence marks the column sortable (when table-level sorting is enabled);
   * the value is the identifier reported to `onSortChange`. Use the column's
   * key unless the data source sorts by a different field.
   */
  sortKey?: string;
  /** CSS class applied to every body cell in this column. */
  className?: string;
  /** Horizontal alignment for body cells in this column. */
  align?: TableResourceAlign;
  /** Marks the column's cells as editable when `editing` is configured. */
  editable?: boolean;
  /**
   * Escape hatch: renders the cell from the whole row, taking precedence over
   * the type renderer. Receives the row and its index in the full data set.
   */
  render?: (row: TRow, index: number) => ReactNode;
}

/**
 * A column either reads its value directly from `row[key]`, or supplies an
 * accessor function for derived values while `key` remains the stable
 * identity used for ids and React reconciliation.
 */
export type ColumnSource<TRow> =
  { key: keyof TRow } | { key: keyof TRow; accessor: (row: TRow) => unknown };

/**
 * Type-discriminated part. `type` is optional only for `text` (the default);
 * every other type must be spelled out, and `options` is required exactly
 * when `{} extends ColumnTypeMap[K]` is false (i.e. when the type's options
 * shape has required fields).
 */
type TypePart<K extends keyof ColumnTypeMap> = K extends 'text'
  ? { type?: K; options?: ColumnTypeMap[K] }
  : { type: K } & // `Partial<X> extends X` is true iff X has no required fields —
      // the lint-clean spelling of the `{} extends X` options rule.
      (Partial<ColumnTypeMap[K]> extends ColumnTypeMap[K]
        ? { options?: ColumnTypeMap[K] }
        : { options: ColumnTypeMap[K] });

/**
 * A column definition for rows of type `TRow`: the intersection of the three
 * independent dimensions (base, source, type) distributed across every key of
 * the augmented `ColumnTypeMap`.
 */
export type TableResourceColumn<TRow> = {
  [K in keyof ColumnTypeMap]: BaseColumn<TRow> & ColumnSource<TRow> & TypePart<K>;
}[keyof ColumnTypeMap];
