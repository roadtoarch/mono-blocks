/**
 * MonoBlocks — components/TableResource/columnPreferences.unit.test.ts
 *
 * Chunk-6 coverage for the persistence helpers: guarded load/save around
 * the `mb.table.<persistKey>.*` keys (malformed JSON, wrong shapes, filtered
 * entries, the never-persist-an-empty-set guard), the `isColumnVisible`
 * absent-key contract, and the stable `orderColumns` reshuffle.
 */
import {
  isColumnVisible,
  loadColumnPreferences,
  orderColumns,
  saveColumnPreferences,
} from './columnPreferences';

import type { TableResourceColumn } from './types';

interface Row {
  id: string;
  name: string;
  qty: number;
}

const columns: TableResourceColumn<Row>[] = [
  { key: 'id', header: 'Id' },
  { key: 'name', header: 'Name' },
  { key: 'qty', header: 'Qty' },
];

function keysOf(list: TableResourceColumn<Row>[]): string[] {
  return list.map((column) => column.key);
}

describe('columnPreferences', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  describe('isColumnVisible', () => {
    it('treats absent keys as visible and only explicit false as hidden', () => {
      expect(isColumnVisible({}, 'a')).toBe(true);
      expect(isColumnVisible({ a: false }, 'a')).toBe(false);
      expect(isColumnVisible({ a: true }, 'a')).toBe(true);
      expect(isColumnVisible({ b: false }, 'a')).toBe(true);
    });
  });

  describe('loadColumnPreferences', () => {
    it('returns an empty object without a persistKey', () => {
      globalThis.localStorage.setItem('mb.table.k.visibility', '{"a":false}');
      expect(loadColumnPreferences()).toEqual({});
    });

    it('returns an empty object when nothing is stored', () => {
      expect(loadColumnPreferences('empty')).toEqual({});
    });

    it('round-trips stored visibility and order', () => {
      globalThis.localStorage.setItem('mb.table.k1.visibility', JSON.stringify({ b: false }));
      globalThis.localStorage.setItem('mb.table.k1.order', JSON.stringify(['c', 'a', 'b']));
      expect(loadColumnPreferences('k1')).toEqual({
        visibility: { b: false },
        order: ['c', 'a', 'b'],
      });
    });

    it('ignores malformed JSON per field', () => {
      globalThis.localStorage.setItem('mb.table.k2.visibility', 'not json {');
      expect(loadColumnPreferences('k2')).toEqual({});

      globalThis.localStorage.setItem('mb.table.k3.order', '[oops');
      expect(loadColumnPreferences('k3')).toEqual({});
    });

    it('keeps only boolean visibility entries and string order entries', () => {
      globalThis.localStorage.setItem(
        'mb.table.k4.visibility',
        '{"a":false,"b":"no","c":1,"d":true}',
      );
      globalThis.localStorage.setItem('mb.table.k4.order', '[1,"x",null,"y"]');
      expect(loadColumnPreferences('k4')).toEqual({
        visibility: { a: false, d: true },
        order: ['x', 'y'],
      });
    });

    it('rejects wrong shapes: array visibility, object order', () => {
      globalThis.localStorage.setItem('mb.table.k5.visibility', '["a"]');
      globalThis.localStorage.setItem('mb.table.k5.order', '{"0":"a"}');
      expect(loadColumnPreferences('k5')).toEqual({});
    });

    it('scopes storage per persistKey', () => {
      saveColumnPreferences('one', { a: false }, ['a'], ['a', 'b']);
      expect(loadColumnPreferences('two')).toEqual({});
      expect(loadColumnPreferences('one')).toEqual({ visibility: { a: false }, order: ['a'] });
    });
  });

  describe('saveColumnPreferences', () => {
    it('persists visibility and order under the mb.table.* keys', () => {
      saveColumnPreferences('k', { a: false }, ['b', 'a'], ['a', 'b']);
      expect(globalThis.localStorage.getItem('mb.table.k.visibility')).toBe('{"a":false}');
      expect(globalThis.localStorage.getItem('mb.table.k.order')).toBe('["b","a"]');
    });

    it('skips the visibility write when every column would be hidden', () => {
      globalThis.localStorage.setItem('mb.table.g.visibility', JSON.stringify({ a: true }));
      saveColumnPreferences('g', { a: false, b: false }, ['b', 'a'], ['a', 'b']);
      // Stored visibility stays untouched; order still updates.
      expect(globalThis.localStorage.getItem('mb.table.g.visibility')).toBe('{"a":true}');
      expect(globalThis.localStorage.getItem('mb.table.g.order')).toBe('["b","a"]');
    });

    it('writes visibility when only some columns are hidden', () => {
      saveColumnPreferences('s', { a: false }, [], ['a', 'b']);
      expect(globalThis.localStorage.getItem('mb.table.s.visibility')).toBe('{"a":false}');
    });

    it('writes empty visibility when there are no columns to guard', () => {
      saveColumnPreferences('e', {}, [], []);
      expect(globalThis.localStorage.getItem('mb.table.e.visibility')).toBe('{}');
      expect(globalThis.localStorage.getItem('mb.table.e.order')).toBe('[]');
    });
  });

  describe('orderColumns', () => {
    it('is the identity for an empty order', () => {
      expect(keysOf(orderColumns(columns, []))).toEqual(['id', 'name', 'qty']);
    });

    it('lists ordered keys first in sequence, unlisted keep original order', () => {
      expect(keysOf(orderColumns(columns, ['qty']))).toEqual(['qty', 'id', 'name']);
      expect(keysOf(orderColumns(columns, ['name', 'qty']))).toEqual(['name', 'qty', 'id']);
      expect(keysOf(orderColumns(columns, ['qty', 'name', 'id']))).toEqual(['qty', 'name', 'id']);
    });

    it('ignores unknown order keys and missing columns', () => {
      expect(keysOf(orderColumns(columns, ['x', 'id']))).toEqual(['id', 'name', 'qty']);
    });
  });
});
