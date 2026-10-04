/**
 * MonoBlocks — components/TableResource/hooks/useCellEditing.ts
 *
 * Chunk 9 state for MRT-style inline editing: exactly one open cell, a
 * synchronous lock around in-flight saves (a rejection keeps the editor
 * open with an error; a resolution closes it without local echo), and the
 * pending-row id the view uses to keep that row's cells inert.
 */
import { useRef, useState } from 'react';

import { buildCellPatch, coerceCellText } from '../cellEditing';

import type { TableResourceEditingConfig } from '../types';

/** Which cell is open for editing. */
export interface CellEditTarget<TRow> {
  /** Row id (from `getRowId`) owning the open cell. */
  rowId: string;
  /** Column key of the open cell. */
  key: keyof TRow;
}

export interface UseCellEditingResult<TRow> {
  /** The open cell, or `null` while read-only. */
  target: CellEditTarget<TRow> | null;
  /** Row whose save is in flight (its editor input renders disabled). */
  pendingRowId: string | null;
  /** True once the open editor's save has been rejected. */
  error: boolean;
  /** Opens a cell (no-op while any save is pending or `editing` is absent). */
  openCell: (rowId: string, key: keyof TRow) => void;
  /** Closes the editor without saving and clears any error. */
  cancelEdit: () => void;
  /** Saves the coerced text; a returned promise locks editing until settle. */
  commitEdit: (rowId: string, key: keyof TRow, current: unknown, text: string) => void;
}

export function useCellEditing<TRow>(
  onSave: TableResourceEditingConfig<TRow>['onSave'] | undefined,
): UseCellEditingResult<TRow> {
  const [target, setTarget] = useState<CellEditTarget<TRow> | null>(null);
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  // Synchronous re-entrancy lock: state updates are async, but Enter and
  // blur can fire back-to-back before React re-renders.
  const pending = useRef(false);

  const openCell = (rowId: string, key: keyof TRow): void => {
    if (onSave === undefined || pending.current) {
      return;
    }
    setError(false);
    setTarget({ rowId, key });
  };

  const cancelEdit = (): void => {
    if (pending.current) {
      return;
    }
    setTarget(null);
    setError(false);
  };

  const commitEdit = (rowId: string, key: keyof TRow, current: unknown, text: string): void => {
    if (onSave === undefined || pending.current) {
      return;
    }
    const patch = buildCellPatch<TRow>(key, coerceCellText(current, text));
    let result: void | Promise<void>;
    try {
      result = onSave(rowId, patch);
    } catch {
      // A synchronous throw rejects just like a rejected promise: keep the
      // editor open and flag it.
      setError(true);
      return;
    }
    if (!(result instanceof Promise)) {
      // Sync completion closes without local echo; `rows` still owns truth.
      setTarget(null);
      setError(false);
      return;
    }
    pending.current = true;
    setPendingRowId(rowId);
    setError(false);
    void (async () => {
      try {
        await result;
        setTarget(null);
      } catch {
        setError(true);
      } finally {
        pending.current = false;
        setPendingRowId(null);
      }
    })();
  };

  return { target, pendingRowId, error, openCell, cancelEdit, commitEdit };
}
