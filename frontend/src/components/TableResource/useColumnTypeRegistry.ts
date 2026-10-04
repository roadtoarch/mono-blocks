/**
 * MonoBlocks — components/TableResource/useColumnTypeRegistry.ts
 *
 * Reads the merged column-type registry (builtins + provider registrations).
 */
import { use } from 'react';

import { ColumnTypeRegistryContext } from './registry';

import type { ColumnTypeRegistry } from './types';

/** Returns the column-type registry in scope. */
export function useColumnTypeRegistry(): ColumnTypeRegistry {
  return use(ColumnTypeRegistryContext);
}
