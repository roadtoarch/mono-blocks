/**
 * MonoBlocks — components/TableResource/ColumnTypeRegistryProvider.tsx
 *
 * Merges application column-type registrations (from `defineColumnTypes`)
 * over the builtin registry for everything rendered beneath it.
 */

import { builtinColumnTypes, ColumnTypeRegistryContext } from './registry';

import type { ColumnTypeRegistry, DefineColumnTypesArg } from './types';
import type { ReactNode } from 'react';

/** Props for `ColumnTypeRegistryProvider`. */
export interface ColumnTypeRegistryProviderProps {
  /** Complete registration record for every non-builtin column type. */
  types: DefineColumnTypesArg;
  /** Subtree that may render cells using the registered types. */
  children: ReactNode;
}

/** Provides merged column-type registrations to descendant cells. */
export function ColumnTypeRegistryProvider({
  types,
  children,
}: ColumnTypeRegistryProviderProps): ReactNode {
  const value: ColumnTypeRegistry = { ...builtinColumnTypes, ...types };
  return <ColumnTypeRegistryContext value={value}>{children}</ColumnTypeRegistryContext>;
}
