/**
 * MonoBlocks — components/TableResource/index.ts
 *
 * Public barrel (chunk-10 flip). The legacy table that lived here is
 * replaced by the typed, config-opt-in implementation: `TableResourceView`
 * is exported under the long-standing `TableResource` name, alongside the
 * column-type registry helpers and the full type layer. Deep behavior is
 * pinned in TableResourceView.unit.test.tsx; this file is the public edge.
 *
 * Deliberately `.ts` (not `.tsx`): the file defines no components or JSX —
 * `react-refresh/only-export-components` is scoped to JSX-bearing files,
 * and a re-export module is not one of them.
 */
export { TableResourceView as TableResource } from './TableResourceView';
export { ColumnTypeRegistryProvider } from './ColumnTypeRegistryProvider';
export { builtinColumnTypes, defineColumnTypes } from './registry';
export { useColumnTypeRegistry } from './useColumnTypeRegistry';

export type * from './types';
