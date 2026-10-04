/**
 * MonoBlocks — components/TableResource/cellEditing.unit.test.ts
 *
 * Chunk 9: coercion of the editor's raw text against the cell's current
 * value, and construction of the one-key `Partial<TRow>` patch reported to
 * `editing.onSave`.
 */
import { buildCellPatch, coerceCellText, seedCellText } from './cellEditing';

describe('coerceCellText', () => {
  it('parses numbers, letting invalid input fall through as NaN', () => {
    expect(coerceCellText(1234.5, '99')).toBe(99);
    expect(coerceCellText(0, '0')).toBe(0);
    expect(coerceCellText(1, 'abc')).toBeNaN();
  });

  it('accepts true only, trimmed and case-insensitively', () => {
    expect(coerceCellText(true, ' TRUE ')).toBe(true);
    expect(coerceCellText(false, 'true')).toBe(true);
    expect(coerceCellText(true, 'yes')).toBe(false);
    expect(coerceCellText(false, 'false')).toBe(false);
  });

  it('passes strings, null, undefined, and objects through as raw text', () => {
    expect(coerceCellText('a', 'b')).toBe('b');
    expect(coerceCellText(null, 'b')).toBe('b');
    expect(coerceCellText(undefined, 'b')).toBe('b');
    expect(coerceCellText({ x: 1 }, 'b')).toBe('b');
  });
});

describe('seedCellText', () => {
  it('seeds primitives as their text and nullish as empty', () => {
    expect(seedCellText('a')).toBe('a');
    expect(seedCellText(1234.5)).toBe('1234.5');
    expect(seedCellText(true)).toBe('true');
    expect(seedCellText(null)).toBe('');
    expect(seedCellText(undefined)).toBe('');
  });

  it('seeds objects as JSON text and functions as empty', () => {
    expect(seedCellText({ x: 1 })).toBe('{"x":1}');
    expect(seedCellText([1, 2])).toBe('[1,2]');
    expect(seedCellText(() => 1)).toBe('');
  });
});

describe('buildCellPatch', () => {
  interface Row {
    id: string;
    qty: number;
  }

  it('builds a single-key Partial even when the value type cannot match', () => {
    // Text fallback on a number-only field is the TS2345 case a plain
    // `patch[key] = value` assignment could not express.
    const patch = buildCellPatch<Row>('qty', 'not-a-number');
    expect(patch).toEqual({ qty: 'not-a-number' });
    expect(Object.keys(patch)).toHaveLength(1);
  });

  it('keeps non-string values intact', () => {
    expect(buildCellPatch<Row>('qty', 99)).toEqual({ qty: 99 });
    expect(buildCellPatch<Row>('id', 'r9')).toEqual({ id: 'r9' });
  });
});
