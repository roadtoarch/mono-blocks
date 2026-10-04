/**
 * MonoBlocks — pages/ListPage/columns.unit.test.tsx
 *
 * Batch A2: pins the schema → TableResource column mapping — visible
 * fields in order, sortKeys only on sortable fields, numeric/mono cell
 * classes, ref-cache resolution, the first-field detail link, and the
 * synthetic trailing actions column.
 */
import { Link } from '@tanstack/react-router';
import { Fragment, isValidElement } from 'react';

import { buildListColumns } from './columns';

import type { EntityConfig, EntityRecord } from '@/schema/types';

// ── Fixtures ──────────────────────────────────────────────────────────────

const schema: EntityConfig = {
  singular: 'Widget',
  plural: 'Widgets',
  icon: 'TableSplit',
  titleField: 'name',
  idPrefix: 'WID',
  defaultSort: { key: 'name', dir: 'asc' },
  searchFields: ['name'],
  eventTypes: [],
  fields: [
    { key: 'name', label: 'Name', type: 'text', sortable: true },
    { key: 'owner', label: 'Owner', type: 'text', ref: 'technician' },
    { key: 'status', label: 'Status', type: 'select' },
    { key: 'due', label: 'Due', type: 'date' },
    { key: 'qty', label: 'Qty', type: 'number' },
    { key: 'code', label: 'Code', type: 'text', mono: true },
    { key: 'internal', label: 'Internal', type: 'text', hiddenInList: true },
  ],
};

const record: EntityRecord = {
  id: 'w1',
  entity_type: 'work_order',
  name: 'Wrench',
  owner: 't1',
  due: '2026-01-15',
  qty: 3,
  code: 'ABC-1',
};

const columns = buildListColumns('work_order', schema, { technician: { t1: 'Dana' } });

const byKey = (key: string) => columns.find((column) => column.key === key);

// ── Tests ─────────────────────────────────────────────────────────────────

describe('buildListColumns (batch A2)', () => {
  it('maps visible fields in schema order with the actions column last', () => {
    expect(columns.map((column) => column.key)).toEqual([
      'name',
      'owner',
      'status',
      'due',
      'qty',
      'code',
      'actions',
    ]);
    expect(columns[0].header).toBe('Name');
  });

  it('drops hiddenInList fields', () => {
    expect(columns.some((column) => column.key === 'internal')).toBe(false);
  });

  it('marks only sortable fields with a sortKey', () => {
    expect(
      columns.filter((column) => column.sortKey !== undefined).map((column) => column.key),
    ).toEqual(['name']);
  });

  it('applies numeric and mono classes to their body cells', () => {
    expect(byKey('qty')?.className).toContain('mb-table__cell--numeric');
    expect(byKey('code')?.className).toContain('cds--mono');
    expect(byKey('due')?.className).toContain('cds--mono');
    expect(byKey('name')?.className).toBeUndefined();
  });

  it('renders the first field as the detail link', () => {
    const node = columns[0].render?.(record, 0);
    expect(isValidElement(node) && node.type === Link).toBe(true);
  });

  it('resolves ref values through the cache with an em-dash fallback', () => {
    expect(byKey('owner')?.render?.(record, 1)).toBe('Dana');
    expect(byKey('owner')?.render?.({ ...record, owner: 'missing' }, 1)).toBe('missing');
    expect(byKey('owner')?.render?.({ ...record, owner: undefined }, 1)).toBe('—');
  });

  it('formats date and number fields through the shared formatters', () => {
    expect(byKey('due')?.render?.(record, 3)).toBe('15 Jan 2026');
    expect(byKey('qty')?.render?.(record, 4)).toBe('3');
  });

  it('builds a trailing actions column with inline link buttons', () => {
    const actions = byKey('actions');
    expect(actions?.className).toBe('mb-table__cell--actions');
    expect(actions?.sortKey).toBeUndefined();
    const node = actions?.render?.(record, 6);
    expect(isValidElement(node) && node.type === Fragment).toBe(true);
  });
});
