/**
 * MonoBlocks — components/TableResource/columnPreferences.ts
 *
 * Chunk 6: pure helpers for column visibility/order persistence. Reads and
 * writes the `mb.table.<persistKey>.visibility` / `.order` localStorage keys
 * with guards around unavailable storage and malformed JSON, and orders
 * columns against a saved key list. Loading and ordering are side-effect
 * free; `saveColumnPreferences` is the only localStorage writer.
 */
import type {
  TableResourceColumn,
  TableResourceColumnOrder,
  TableResourceColumnVisibility,
} from './types';
import type { RowData } from '@tanstack/react-table';

/** Persisted preferences for one `persistKey`; absent fields mean "no saved state". */
export interface ColumnPreferences {
  /** Saved column visibility (explicit `false` entries are hidden). */
  visibility?: TableResourceColumnVisibility;
  /** Saved column order (keys not listed keep their relative order, last). */
  order?: TableResourceColumnOrder;
}

function visibilityKey(persistKey: string): string {
  return `mb.table.${persistKey}.visibility`;
}

function orderKey(persistKey: string): string {
  return `mb.table.${persistKey}.order`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parses a stored visibility blob, keeping only boolean entries. */
function parseVisibility(raw: string): TableResourceColumnVisibility | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return undefined;
    const visibility: TableResourceColumnVisibility = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'boolean') visibility[key] = value;
    }
    return visibility;
  } catch {
    return undefined;
  }
}

/** Parses a stored order blob, keeping only string entries. */
function parseOrder(raw: string): TableResourceColumnOrder | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return undefined;
    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return undefined;
  }
}

/**
 * Loads persisted column preferences for a `persistKey`. Returns an empty
 * object when there is no key, nothing is stored, or the stored value is
 * malformed — corrupted storage never throws into render.
 */
export function loadColumnPreferences(persistKey?: string): ColumnPreferences {
  if (persistKey === undefined) return {};
  try {
    const preferences: ColumnPreferences = {};
    const storedVisibility = globalThis.localStorage.getItem(visibilityKey(persistKey));
    if (storedVisibility !== null) {
      const visibility = parseVisibility(storedVisibility);
      if (visibility !== undefined) preferences.visibility = visibility;
    }
    const storedOrder = globalThis.localStorage.getItem(orderKey(persistKey));
    if (storedOrder !== null) {
      const order = parseOrder(storedOrder);
      if (order !== undefined) preferences.order = order;
    }
    return preferences;
  } catch {
    return {};
  }
}

/**
 * True unless the column is explicitly hidden. `Record<string, boolean>`
 * lies about missing entries: absent keys run as `undefined` at runtime and
 * mean "visible".
 */
export function isColumnVisible(visibility: TableResourceColumnVisibility, key: string): boolean {
  // Not `value !== false`: lint flags it (the Record claims non-optional
  // booleans) and its suggested fix — using the boolean directly — would
  // treat absent keys as hidden.
  return !Object.is(visibility[key], false);
}

/**
 * Persists visibility and order under `persistKey`. The visibility write is
 * skipped when it would hide every listed column (a stale empty selection
 * must not permanently blank the table); the order write still proceeds.
 */
export function saveColumnPreferences(
  persistKey: string,
  visibility: TableResourceColumnVisibility,
  order: TableResourceColumnOrder,
  columnKeys: readonly string[],
): void {
  const hidesEveryColumn =
    columnKeys.length > 0 && columnKeys.every((key) => !isColumnVisible(visibility, key));
  try {
    if (!hidesEveryColumn) {
      globalThis.localStorage.setItem(visibilityKey(persistKey), JSON.stringify(visibility));
    }
    globalThis.localStorage.setItem(orderKey(persistKey), JSON.stringify(order));
  } catch {
    // Storage unavailable or full — preferences are best-effort.
  }
}

/**
 * Orders columns by a saved key list: listed keys first in that sequence,
 * unlisted keys appended in their original relative order. An empty list is
 * the identity (stable sort).
 */
export function orderColumns<TRow extends RowData>(
  columns: readonly TableResourceColumn<TRow>[],
  order: TableResourceColumnOrder,
): TableResourceColumn<TRow>[] {
  if (order.length === 0) return [...columns];
  const rank = new Map(order.map((key, index) => [key, index]));
  const unlisted = Number.MAX_SAFE_INTEGER;
  return [...columns]
    .map((column, index) => ({ column, index, rank: rank.get(String(column.key)) ?? unlisted }))
    .sort((a, b) => (a.rank === b.rank ? a.index - b.index : a.rank - b.rank))
    .map((entry) => entry.column);
}
