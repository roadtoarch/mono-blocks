/**
 * MonoBlocks — components/TableResource/types/registry.ts
 *
 * Type-level contract for the column type registry: what a registered type
 * provides (renderer, optional editor) and the exact argument shape
 * `defineColumnTypes` demands so every non-builtin type is registered.
 */
import type { BuiltinColumnTypeName, ColumnTypeMap } from './column';
import type { ReactNode } from 'react';

/** Props handed to a registered type's inline editor. */
export interface ColumnTypeEditorProps<K extends keyof ColumnTypeMap> {
  /** Current raw cell value. */
  value: unknown;
  /** The column's options for this type. */
  options: ColumnTypeMap[K];
  /** Reports an edited value; commit/cancel is owned by the cell layer. */
  onChange: (next: unknown) => void;
}

/** Editor component signature for a registered column type. */
export type ColumnTypeEditor<K extends keyof ColumnTypeMap> = (
  props: ColumnTypeEditorProps<K>,
) => ReactNode;

/** A registered column type: renderer plus optional inline editor. */
export interface ColumnTypeDef<K extends keyof ColumnTypeMap = keyof ColumnTypeMap> {
  /** Formats a raw (non-null) cell value for display. */
  render: (value: unknown, options: ColumnTypeMap[K]) => ReactNode;
  /** Inline editor used when a column of this type is editable. */
  editor?: ColumnTypeEditor<K>;
}

/**
 * Runtime registry shape: every key of the (possibly augmented)
 * `ColumnTypeMap` maps to its definition. Values may be `undefined` before a
 * provider merges registrations in; the cell layer falls back to `text`.
 */
export type ColumnTypeRegistry = {
  [K in keyof ColumnTypeMap]?: ColumnTypeDef<K>;
};

/**
 * Argument accepted by `defineColumnTypes`: exactly the non-builtin keys of
 * `ColumnTypeMap`, so a missing registration fails to compile and a builtin
 * key (e.g. `text`) is rejected as an excess property.
 */
export type DefineColumnTypesArg = {
  [K in Exclude<keyof ColumnTypeMap, BuiltinColumnTypeName>]: ColumnTypeDef<K>;
};
