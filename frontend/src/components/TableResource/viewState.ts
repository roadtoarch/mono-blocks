/**
 * MonoBlocks — components/TableResource/viewState.ts
 *
 * Maps the parent-owned fetch `status` plus the current row count to a
 * discriminated view-state union the table body switches on. Only
 * `success` consults the row count; every other status is status-driven.
 */
import type { TableResourceStatus } from './types/config';

/** Discriminant for the body's current view. */
export type TableResourceViewState =
  | { kind: 'initial' }
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error' }
  | { kind: 'data' };

/**
 * Exhaustiveness helper: compiles only when the argument is `never`, so a
 * future status added without a matching branch fails the build.
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

/**
 * Derive the body view from the lifecycle status and row count.
 *
 * - `initial`  → nothing fetched yet (rows are ignored)
 * - `loading`  → skeleton rows
 * - `error`    → error message with optional retry
 * - `success`  → `empty` when there are no rows, otherwise `data`
 */
export function deriveViewState(
  status: TableResourceStatus,
  rowCount: number,
): TableResourceViewState {
  switch (status) {
    case 'initial':
      return { kind: 'initial' };
    case 'loading':
      return { kind: 'loading' };
    case 'error':
      return { kind: 'error' };
    case 'success':
      return rowCount === 0 ? { kind: 'empty' } : { kind: 'data' };
    default:
      return assertNever(status);
  }
}
