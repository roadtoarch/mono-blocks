/**
 * MonoBlocks — schema/config.unit.test.ts
 *
 * Unit tests for schema/config.ts — SCHEMA, TAG_MAPS, STORE_KEYS, navItems.
 */

import { describe, expect, it } from 'vitest';

import { SCHEMA, STORE_KEYS, TAG_MAPS, navItems } from './config.tsx';
import { ENTITY_TYPES, type TagColor } from './types.ts';

// ── SCHEMA ──────────────────────────────────────────────────────────────────

describe('SCHEMA', () => {
  it('has a config for every entity type', () => {
    for (const type of ENTITY_TYPES) {
      expect(SCHEMA[type]).toBeDefined();
    }
  });

  it('has 5 entity types', () => {
    expect(Object.keys(SCHEMA)).toHaveLength(5);
  });

  it.each([
    ['customer', 'Customer', 'Customers', 'cust', 'name'],
    ['site', 'Site', 'Sites', 'site', 'name'],
    ['equipment', 'Equipment', 'Equipment', 'equip', 'serial_number'],
    ['technician', 'Technician', 'Technicians', 'tech', 'name'],
    ['work_order', 'Work order', 'Work orders', 'wo', 'title'],
  ] as const)('%s has correct metadata', (type, singular, plural, idPrefix, titleField) => {
    const cfg = SCHEMA[type];
    expect(cfg.singular).toBe(singular);
    expect(cfg.plural).toBe(plural);
    expect(cfg.idPrefix).toBe(idPrefix);
    expect(cfg.titleField).toBe(titleField);
  });

  it('every config has at least one field', () => {
    for (const type of ENTITY_TYPES) {
      expect(SCHEMA[type].fields.length).toBeGreaterThan(0);
    }
  });

  it('every config has a defaultSort', () => {
    for (const type of ENTITY_TYPES) {
      const s = SCHEMA[type].defaultSort;
      expect(s.key).toBeTruthy();
      expect(['asc', 'desc']).toContain(s.dir);
    }
  });

  it('every config has searchFields', () => {
    for (const type of ENTITY_TYPES) {
      expect(SCHEMA[type].searchFields.length).toBeGreaterThan(0);
    }
  });

  it('required fields have required: true', () => {
    // customer.name should be required
    const nameField = SCHEMA.customer.fields.find((f) => f.key === 'name');
    expect(nameField?.required).toBe(true);
  });

  it('unique fields are marked', () => {
    const emailField = SCHEMA.customer.fields.find((f) => f.key === 'billing_email');
    expect(emailField?.unique).toBe(true);
    const serialField = SCHEMA.equipment.fields.find((f) => f.key === 'serial_number');
    expect(serialField?.unique).toBe(true);
  });

  it('select fields with filterable have options', () => {
    for (const type of ENTITY_TYPES) {
      for (const f of SCHEMA[type].fields) {
        if (f.filterable) {
          expect(f.type).toBe('select');
          expect(f.options).toBeDefined();
          if (!f.options) continue;
          expect(f.options.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('relations are defined for site, equipment, work_order', () => {
    expect(SCHEMA.site.relations).toHaveLength(1);
    expect(SCHEMA.equipment.relations).toHaveLength(1);
    expect(SCHEMA.work_order.relations).toHaveLength(2);
    expect(SCHEMA.customer.relations).toBeUndefined();
    expect(SCHEMA.technician.relations).toBeUndefined();
  });
});

// ── TAG_MAPS ────────────────────────────────────────────────────────────────

describe('TAG_MAPS', () => {
  it('has an entry for every entity type', () => {
    for (const type of ENTITY_TYPES) {
      expect(TAG_MAPS[type]).toBeDefined();
    }
  });

  it('customer has status and tier maps', () => {
    expect(TAG_MAPS.customer.status).toBeDefined();
    expect(TAG_MAPS.customer.tier).toBeDefined();
  });

  it('work_order has status and priority maps', () => {
    expect(TAG_MAPS.work_order.status).toBeDefined();
    expect(TAG_MAPS.work_order.priority).toBeDefined();
  });

  it('tag colors are valid', () => {
    const valid: TagColor[] = ['green', 'gray', 'blue', 'purple', 'red', 'cyan'];
    for (const type of ENTITY_TYPES) {
      for (const family of Object.values(TAG_MAPS[type])) {
        for (const color of Object.values(family ?? {})) {
          expect(valid).toContain(color);
        }
      }
    }
  });
});

// ── STORE_KEYS ──────────────────────────────────────────────────────────────

describe('STORE_KEYS', () => {
  it('maps every entity type to a plural collection key', () => {
    for (const type of ENTITY_TYPES) {
      const key = STORE_KEYS[type];
      expect(key).toBeTruthy();
      expect(typeof key).toBe('string');
    }
  });

  it('customer → customers, work_order → work_orders', () => {
    expect(STORE_KEYS.customer).toBe('customers');
    expect(STORE_KEYS.work_order).toBe('work_orders');
  });
});

// ── navItems ────────────────────────────────────────────────────────────────

describe('navItems', () => {
  it('returns 6 items (dashboard + 5 entity types)', () => {
    expect(navItems()).toHaveLength(6);
  });

  it('dashboard is first', () => {
    const items = navItems();
    expect(items[0].key).toBe('dashboard');
    expect(items[0].path).toBe('/dashboard');
  });

  it('every entity type has a nav item', () => {
    const items = navItems();
    const keys = items.map((i) => i.key);
    for (const type of ENTITY_TYPES) {
      expect(keys).toContain(type);
    }
  });

  it('paths match nested URL pattern', () => {
    const items = navItems();
    const paths = items.map((i) => i.path);
    expect(paths).toContain('/customers');
    expect(paths).toContain('/sites');
    expect(paths).toContain('/equipment');
    expect(paths).toContain('/technicians');
    expect(paths).toContain('/work-orders');
  });
});
