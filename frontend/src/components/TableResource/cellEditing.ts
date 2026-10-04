/**
 * MonoBlocks — components/TableResource/cellEditing.ts
 *
 * Chunk 9 helpers for MRT-style inline editing: seeding the editor from
 * the raw cell value, coercion of the editor's raw text to the cell's
 * current runtime value shape, and construction of the one-key
 * `Partial<TRow>` patch handed to `editing.onSave`.
 */
/**
 * Coerces editor text against the cell's current value: numbers parse,
 * booleans accept `'true'` (trimmed, case-insensitive; anything else is
 * false), and every other shape (string, null, undefined, objects) passes
 * through as the raw text.
 */
export function coerceCellText(current: unknown, text: string): unknown {
  if (typeof current === 'number') {
    return Number(text);
  }
  if (typeof current === 'boolean') {
    return text.trim().toLowerCase() === 'true';
  }
  return text;
}

/**
 * Seeds the editor input from the raw cell value: nullish → empty string,
 * strings/numbers/booleans/bigints → their text, objects → JSON text (a
 * raw `[object Object]` edit would be useless), functions → empty string.
 * Every `String()` sits on a concrete primitive, never on `unknown`.
 */
export function seedCellText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (typeof value === 'symbol') {
    return value.description ?? '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return '';
}

/**
 * Builds the single-key patch reported to `onSave`. `Object.assign`
 * performs the key write without a type assertion: the value stays
 * `unknown` at the boundary, because a plain `patch[key] = value` cannot
 * be proven for every row shape (a text fallback fails on rows whose
 * fields never contain a string).
 */
export function buildCellPatch<TRow>(key: keyof TRow, value: unknown): Partial<TRow> {
  return Object.assign<Partial<TRow>, Record<string, unknown>>({}, { [key]: value });
}
