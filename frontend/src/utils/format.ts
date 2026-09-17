/**
 * MonoBlocks — utils/format.ts
 *
 * Display formatters. Port of prototype shell.js fmt object.
 * All functions are pure and synchronous.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format an ISO date string for display.
 * '2026-09-18' → '18 Sep 2026'
 * null/undefined/'' → '—'
 */
export const date = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const sliced = iso.slice(0, 10);
  const parts = sliced.split('-');
  if (parts.length !== 3) return sliced;
  const day = parseInt(parts[2], 10);
  const m = parseInt(parts[1], 10);
  return `${String(day)} ${MONTHS[m - 1] || parts[1]} ${parts[0]}`;
};

/**
 * Format a full ISO timestamp for display.
 * '2026-09-14T08:12:00.000Z' → '14 Sep 2026, 08:12'
 * null/undefined → '—'
 */
export const dateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${String(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear())}, ${hh}:${mm}`;
};

/**
 * Format a number with locale separators.
 * 285000 → '285,000'
 * null/undefined/'' → '—'
 */
export const number = (n: number | null | undefined | string): string => {
  if (n === null || n === undefined || n === '') return '—';
  const num = Number(n);
  if (isNaN(num)) return String(n);
  return num.toLocaleString('en-US');
};

/**
 * Escape a string for safe interpolation into innerHTML.
 * Primitives are stringified directly; objects fall back to JSON.
 */
export const esc = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const raw =
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : JSON.stringify(value);
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Humanize an event type for display.
 * 'status_changed' → 'Status changed'
 * 'checked_in' → 'Checked in'
 */
export const eventType = (type: string): string => {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

/**
 * Summarize an event payload as a single readable line.
 */
export const eventSummary = (payload: Record<string, unknown>): string => {
  const entries = Object.entries(payload);
  if (!entries.length) return '';
  return entries
    .map(([key, val]) => {
      const label = key
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      const display =
        val == null
          ? '—'
          : typeof val === 'string'
            ? val
            : typeof val === 'number' || typeof val === 'boolean'
              ? String(val)
              : JSON.stringify(val);
      return `${label}: ${display}`;
    })
    .join('; ');
};
