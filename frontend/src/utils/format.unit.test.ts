/**
 * MonoBlocks — utils/format.unit.test.ts
 *
 * Unit tests for display formatters: date, dateTime, number, esc,
 * eventType, eventSummary.
 */

import { describe, expect, it } from 'vitest';

import { date, dateTime, esc, eventType, eventSummary, number } from './format.ts';

// ── date ────────────────────────────────────────────────────────────────────

describe('date', () => {
  it('formats a standard ISO date', () => {
    expect(date('2026-09-18')).toBe('18 Sep 2026');
  });

  it('formats January 1 correctly', () => {
    expect(date('2026-01-01')).toBe('1 Jan 2026');
  });

  it('handles a full ISO timestamp (ignores time part)', () => {
    expect(date('2026-12-25T15:30:00.000Z')).toBe('25 Dec 2026');
  });

  it('returns — for null', () => {
    expect(date(null)).toBe('—');
  });

  it('returns — for undefined', () => {
    expect(date(undefined)).toBe('—');
  });

  it('returns — for empty string', () => {
    expect(date('')).toBe('—');
  });

  it('handles leap day', () => {
    expect(date('2028-02-29')).toBe('29 Feb 2028');
  });

  it('returns the raw slice when date parts are not 3 segments', () => {
    expect(date('2026-09')).toBe('2026-09');
  });
});

// ── dateTime ────────────────────────────────────────────────────────────────

describe('dateTime', () => {
  it('formats a full ISO timestamp', () => {
    expect(dateTime('2026-09-14T08:12:00.000Z')).toBe('14 Sep 2026, 08:12');
  });

  it('pads hours and minutes', () => {
    expect(dateTime('2026-01-01T01:05:00.000Z')).toBe('1 Jan 2026, 01:05');
  });

  it('handles midnight UTC', () => {
    expect(dateTime('2026-06-15T00:00:00.000Z')).toBe('15 Jun 2026, 00:00');
  });

  it('returns — for null', () => {
    expect(dateTime(null)).toBe('—');
  });

  it('returns — for undefined', () => {
    expect(dateTime(undefined)).toBe('—');
  });

  it('returns the raw string for invalid dates', () => {
    expect(dateTime('not-a-date')).toBe('not-a-date');
  });
});

// ── number ──────────────────────────────────────────────────────────────────

describe('number', () => {
  it('formats large numbers with locale separators', () => {
    expect(number(285000)).toBe('285,000');
  });

  it('formats small numbers without separators', () => {
    expect(number(42)).toBe('42');
  });

  it('formats zero', () => {
    expect(number(0)).toBe('0');
  });

  it('returns — for null', () => {
    expect(number(null)).toBe('—');
  });

  it('returns — for undefined', () => {
    expect(number(undefined)).toBe('—');
  });

  it('returns — for empty string', () => {
    expect(number('')).toBe('—');
  });

  it('handles string input that is a valid number', () => {
    expect(number('12345')).toBe('12,345');
  });

  it('returns the raw value for NaN string', () => {
    expect(number('abc')).toBe('abc');
  });
});

// ── esc ─────────────────────────────────────────────────────────────────────

describe('esc', () => {
  it('escapes HTML special characters', () => {
    expect(esc('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });

  it('escapes ampersands', () => {
    expect(esc('a & b')).toBe('a &amp; b');
  });

  it('escapes single quotes', () => {
    expect(esc("it's")).toBe('it&#39;s');
  });

  it('returns empty string for null', () => {
    expect(esc(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(esc(undefined)).toBe('');
  });

  it('stringifies numbers', () => {
    expect(esc(42)).toBe('42');
  });

  it('stringifies booleans', () => {
    expect(esc(true)).toBe('true');
  });

  it('JSON-stringifies and escapes objects', () => {
    expect(esc({ key: 'val' })).toBe('{&quot;key&quot;:&quot;val&quot;}');
  });

  it('leaves safe text unchanged', () => {
    expect(esc('Hello World')).toBe('Hello World');
  });
});

// ── eventType ───────────────────────────────────────────────────────────────

describe('eventType', () => {
  it('humanizes snake_case event types (title-cases every word)', () => {
    expect(eventType('status_changed')).toBe('Status Changed');
    expect(eventType('checked_in')).toBe('Checked In');
    expect(eventType('certification_renewed')).toBe('Certification Renewed');
    expect(eventType('note_added')).toBe('Note Added');
  });

  it('handles single-word types', () => {
    expect(eventType('assigned')).toBe('Assigned');
  });
});

// ── eventSummary ────────────────────────────────────────────────────────────

describe('eventSummary', () => {
  it('summarizes a payload with string values', () => {
    expect(eventSummary({ from: 'open', to: 'in_progress' })).toBe('From: open; To: in_progress');
  });

  it('summarizes a payload with null values', () => {
    expect(eventSummary({ from: null, to: 'open' })).toBe('From: —; To: open');
  });

  it('summarizes a payload with number values', () => {
    expect(eventSummary({ count: 5 })).toBe('Count: 5');
  });

  it('returns empty string for empty payload', () => {
    expect(eventSummary({})).toBe('');
  });

  it('summarizes a payload with object values', () => {
    const result = eventSummary({ meta: { a: 1 } });
    expect(result).toContain('Meta:');
    expect(result).toContain('{"a":1}');
  });

  it('humanizes key names (title-cases every word)', () => {
    expect(eventSummary({ work_order_id: 'wo-001' })).toContain('Work Order Id');
  });
});
