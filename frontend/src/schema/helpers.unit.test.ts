/**
 * MonoBlocks — schema/helpers.unit.test.ts
 *
 * Unit tests for schema/helpers.ts — get, has, types, field, listFields,
 * optionLabel, tagFamily, titleOf, relLabel, path helpers.
 */

import { describe, expect, it } from 'vitest';

import {
  deletePath,
  detailPath,
  editPath,
  entityPath,
  field,
  get,
  has,
  listFields,
  listPath,
  newPath,
  optionLabel,
  relLabel,
  tagFamily,
  titleOf,
  types,
} from './helpers.ts';
import { SCHEMA } from './config.tsx';
import { ENTITY_TYPES } from './types.ts';

import type { EntityType } from './types.ts';

// ── get ─────────────────────────────────────────────────────────────────────

describe('get', () => {
  it('returns a config for every known entity type', () => {
    for (const type of ENTITY_TYPES) {
      expect(get(type)).toBeDefined();
      expect(get(type).singular).toBeTruthy();
    }
  });

  it('returns undefined for an unknown type (runtime guard)', () => {
    // SCHEMA uses Record<EntityType, ...>, so unknown keys just return undefined
    expect(() => get('unknown' as EntityType)).not.toThrow();
    // But the result would be undefined
    expect((SCHEMA as Record<string, unknown>).unknown).toBeUndefined();
  });
});

// ── has ─────────────────────────────────────────────────────────────────────

describe('has', () => {
  it('returns true for known entity types', () => {
    for (const type of ENTITY_TYPES) {
      expect(has(type)).toBe(true);
    }
  });

  it('returns false for unknown strings', () => {
    expect(has('unknown')).toBe(false);
    expect(has('')).toBe(false);
  });

  it('narrows the type', () => {
    const x = 'customer';
    if (has(x)) {
      // TypeScript should narrow x to EntityType
      const _cfg = get(x);
      expect(_cfg).toBeDefined();
    }
  });
});

// ── types ───────────────────────────────────────────────────────────────────

describe('types', () => {
  it('returns all 5 entity types', () => {
    expect(types()).toHaveLength(5);
  });

  it('returns a new array each call (not the same reference)', () => {
    const a = types();
    const b = types();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

// ── field ───────────────────────────────────────────────────────────────────

describe('field', () => {
  it('finds an existing field', () => {
    const f = field('customer', 'name');
    expect(f).not.toBeNull();
    if (!f) return;
    expect(f.key).toBe('name');
    expect(f.type).toBe('text');
  });

  it('returns null for a missing field', () => {
    expect(field('customer', 'nonexistent')).toBeNull();
  });

  it('returns field with options for select fields', () => {
    const f = field('customer', 'tier');
    expect(f).not.toBeNull();
    if (!f) return;
    expect(f.options).toBeDefined();
    expect(f.options).toHaveLength(3);
  });
});

// ── listFields ──────────────────────────────────────────────────────────────

describe('listFields', () => {
  it('excludes hiddenInList fields', () => {
    const fields = listFields('customer');
    const keys = fields.map((f) => f.key);
    // phone is hiddenInList in customer
    expect(keys).not.toContain('phone');
  });

  it('includes visible fields', () => {
    const fields = listFields('customer');
    const keys = fields.map((f) => f.key);
    expect(keys).toContain('name');
    expect(keys).toContain('tier');
    expect(keys).toContain('status');
  });

  it('returns fields in schema order', () => {
    const fields = listFields('customer');
    const keys = fields.map((f) => f.key);
    expect(keys).toEqual(['name', 'billing_email', 'tier', 'status', 'contract_start']);
  });
});

// ── optionLabel ─────────────────────────────────────────────────────────────

describe('optionLabel', () => {
  it('returns the option label for a known value', () => {
    const f = field('customer', 'tier');
    expect(f).toBeDefined();
    if (!f) return;
    expect(optionLabel(f, 'premium')).toBe('Premium');
  });

  it('returns the raw string value when no options match', () => {
    const f = field('customer', 'tier');
    expect(f).toBeDefined();
    if (!f) return;
    expect(optionLabel(f, 'custom_tier')).toBe('custom_tier');
  });

  it('returns the raw string when field has no options', () => {
    const f = field('customer', 'name');
    expect(f).toBeDefined();
    if (!f) return;
    expect(optionLabel(f, 'Acme Corp')).toBe('Acme Corp');
  });

  it('returns — for nullish/empty values', () => {
    expect(optionLabel(null, null)).toBe('—');
    expect(optionLabel(null, undefined)).toBe('—');
    expect(optionLabel(null, '')).toBe('—');
  });

  it('joins array values', () => {
    const f = field('technician', 'skills');
    expect(f).toBeDefined();
    if (!f) return;
    expect(optionLabel(f, ['hvac', 'electrical'])).toBe('HVAC, Electrical');
  });

  it('stringifies numbers', () => {
    expect(optionLabel(null, 42)).toBe('42');
  });

  it('stringifies booleans', () => {
    expect(optionLabel(null, true)).toBe('true');
  });

  it('JSON-stringifies objects', () => {
    expect(optionLabel(null, { a: 1 })).toBe('{"a":1}');
  });
});

// ── tagFamily ───────────────────────────────────────────────────────────────

describe('tagFamily', () => {
  it('returns correct colors for known tag maps', () => {
    expect(tagFamily('customer', 'status', 'active')).toBe('green');
    expect(tagFamily('customer', 'status', 'inactive')).toBe('gray');
    expect(tagFamily('work_order', 'priority', 'urgent')).toBe('red');
    expect(tagFamily('equipment', 'status', 'down')).toBe('red');
  });

  it('returns gray for unknown values in a known map', () => {
    expect(tagFamily('customer', 'status', 'unknown')).toBe('gray');
  });

  it('returns null for unknown field keys', () => {
    expect(tagFamily('customer', 'nonexistent', 'active')).toBeNull();
  });

  it('returns gray for null/empty value', () => {
    expect(tagFamily('customer', 'status', null)).toBe('gray');
    expect(tagFamily('customer', 'status', '')).toBe('gray');
  });
});

// ── titleOf ─────────────────────────────────────────────────────────────────

describe('titleOf', () => {
  it('returns the titleField value', () => {
    expect(titleOf('customer', { id: 'cust-001', entity_type: 'customer', name: 'Acme' })).toBe(
      'Acme',
    );
  });

  it('falls back to id when titleField is empty', () => {
    expect(titleOf('customer', { id: 'cust-001', entity_type: 'customer', name: '' })).toBe(
      'cust-001',
    );
  });

  it('returns — for null/undefined record', () => {
    expect(titleOf('customer', null)).toBe('—');
    expect(titleOf('customer', undefined)).toBe('—');
  });
});

// ── relLabel ────────────────────────────────────────────────────────────────

describe('relLabel', () => {
  it('formats known relation names', () => {
    expect(relLabel('belongs_to', 'customer')).toBe('Belongs to (customer)');
    expect(relLabel('installed_at', 'site')).toBe('Installed at (site)');
    expect(relLabel('assigned_to', 'technician')).toBe('Assigned to (technician)');
    expect(relLabel('for_site', 'site')).toBe('For site (site)');
  });

  it('passes through unknown relation names', () => {
    expect(relLabel('related_to', 'customer')).toBe('related_to (customer)');
  });
});

// ── Path helpers ────────────────────────────────────────────────────────────

describe('entityPath', () => {
  it.each([
    ['customer', '/customers'],
    ['site', '/sites'],
    ['equipment', '/equipment'],
    ['technician', '/technicians'],
    ['work_order', '/work-orders'],
  ] as const)('%s → %s', (type, expected) => {
    expect(entityPath(type)).toBe(expected);
  });
});

describe('listPath', () => {
  it('returns the same as entityPath', () => {
    for (const type of ENTITY_TYPES) {
      expect(listPath(type)).toBe(entityPath(type));
    }
  });
});

describe('detailPath', () => {
  it('appends id to entity path', () => {
    expect(detailPath('customer', 'cust-001')).toBe('/customers/cust-001');
    expect(detailPath('work_order', 'wo-005')).toBe('/work-orders/wo-005');
  });
});

describe('editPath', () => {
  it('appends id/edit to entity path', () => {
    expect(editPath('customer', 'cust-001')).toBe('/customers/cust-001/edit');
  });
});

describe('newPath', () => {
  it('appends new to entity path', () => {
    expect(newPath('customer')).toBe('/customers/new');
    expect(newPath('work_order')).toBe('/work-orders/new');
  });
});

describe('deletePath', () => {
  it('appends id/delete to entity path', () => {
    expect(deletePath('customer', 'cust-001')).toBe('/customers/cust-001/delete');
  });
});
