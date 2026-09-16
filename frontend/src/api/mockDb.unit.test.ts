/**
 * MonoBlocks — api/mockDb.unit.test.ts
 *
 * Unit tests for the mock backend. Uses vi.useFakeTimers to control latency.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  checkUnique,
  create,
  getRecord,
  list,
  peek,
  peekEvents,
  related,
  remove,
  reset,
  setFailNext,
  update,
} from './mockDb.ts';

import type { EntityType } from '@/schema/types.ts';

import { ENTITY_TYPES } from '@/schema/types.ts';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Resolve an async mockDb call through fake timers. */
async function run<T>(p: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(800);
  return p;
}

/** No-op error handler — prevents unhandled rejections during timer advance. */
function swallow(_err: unknown): void {
  /* intentional no-op for test rejection capture */
}

/**
 * Assert that a mockDb promise rejects. Prevents unhandled rejection by
 * attaching a no-op catch before advancing timers.
 */
async function expectReject(p: Promise<unknown>, message: string): Promise<void> {
  p.catch(swallow);
  await vi.advanceTimersByTimeAsync(800);
  await expect(p).rejects.toThrow(message);
}

/** Seed record counts from the prototype. */
const SEED_COUNTS: Record<EntityType, number> = {
  customer: 8,
  site: 14,
  equipment: 20,
  technician: 6,
  work_order: 15,
};

// ── Setup ───────────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.useFakeTimers();
  localStorage.clear();
  setFailNext(false);
  // Reset store to fresh seed data
  await run(reset());
});

afterEach(() => {
  vi.useRealTimers();
});

// ── list ────────────────────────────────────────────────────────────────────

describe('list', () => {
  it('returns the seeded record count for each entity type', async () => {
    for (const type of ENTITY_TYPES) {
      const rows = await run(list(type));
      expect(rows).toHaveLength(SEED_COUNTS[type]);
    }
  });

  it('returns records sorted by defaultSort', async () => {
    const rows = await run(list('customer'));
    // customer defaultSort = name asc
    const names = rows.map((r) => r.name as string);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it('filters by search query (q)', async () => {
    const rows = await run(list('customer', { q: 'Harborview' }));
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toContain('Harborview');
  });

  it('filters by field filters', async () => {
    const rows = await run(list('customer', { filters: { tier: 'enterprise' } }));
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.tier).toBe('enterprise');
    }
  });

  it('search is case-insensitive', async () => {
    const rows = await run(list('customer', { q: 'harborview' }));
    expect(rows).toHaveLength(1);
  });

  it('search across multiple searchFields', async () => {
    // customer.searchFields = [name, billing_email, phone]
    const rows = await run(list('customer', { q: 'ap@harborviewrealty' }));
    expect(rows).toHaveLength(1);
  });

  it('custom sort overrides defaultSort', async () => {
    const rows = await run(list('customer', { sort: { key: 'name', dir: 'desc' } }));
    const names = rows.map((r) => r.name as string);
    const sorted = [...names].sort((a, b) => b.localeCompare(a));
    expect(names).toEqual(sorted);
  });

  it('returns empty array when no results match query', async () => {
    const rows = await run(list('customer', { q: 'zzz-nonexistent' }));
    expect(rows).toHaveLength(0);
  });

  it('searches array fields (technician skills)', async () => {
    // technician.searchFields includes 'skills' which is a multiselect (array)
    const rows = await run(list('technician', { q: 'hvac' }));
    expect(rows.length).toBeGreaterThan(0);
  });

  it('filters with empty string value pass all records', async () => {
    const all = await run(list('customer'));
    const filtered = await run(list('customer', { filters: { tier: '' } }));
    expect(filtered).toHaveLength(all.length);
  });

  it('sorts numeric fields correctly', async () => {
    // site has square_footage (number); sort by it
    const rows = await run(list('site', { sort: { key: 'square_footage', dir: 'asc' } }));
    const nums = rows.map((r) => r.square_footage as number);
    const sorted = [...nums].sort((a, b) => a - b);
    expect(nums).toEqual(sorted);
  });
});

// ── getRecord ───────────────────────────────────────────────────────────────

describe('getRecord', () => {
  it('returns a record by ID', async () => {
    const rec = await run(getRecord('customer', 'cust-001'));
    expect(rec.id).toBe('cust-001');
    expect(rec.entity_type).toBe('customer');
    expect(rec.name).toBe('Harborview Realty Trust');
  });

  it('throws NotFoundError for missing ID', async () => {
    await expectReject(getRecord('customer', 'cust-999'), 'not found');
  });

  it('returns a clone (mutations do not affect store)', async () => {
    const rec = await run(getRecord('customer', 'cust-001'));
    (rec as Record<string, unknown>).name = 'MUTATED';
    const rec2 = await run(getRecord('customer', 'cust-001'));
    expect(rec2.name).toBe('Harborview Realty Trust');
  });
});

// ── create ──────────────────────────────────────────────────────────────────

describe('create', () => {
  it('creates a new record with auto-generated ID', async () => {
    const rec = await run(
      create('customer', { name: 'Test Corp', billing_email: 'test@example.com' }),
    );
    expect(rec.id).toMatch(/^cust-\d+$/);
    expect(rec.entity_type).toBe('customer');
    expect(rec.name).toBe('Test Corp');
  });

  it('incremental IDs', async () => {
    const r1 = await run(create('customer', { name: 'A', billing_email: 'a@test.com' }));
    const r2 = await run(create('customer', { name: 'B', billing_email: 'b@test.com' }));
    const n1 = parseInt(r1.id.split('-')[1], 10);
    const n2 = parseInt(r2.id.split('-')[1], 10);
    expect(n2).toBe(n1 + 1);
  });

  it('new record appears in list', async () => {
    await run(create('customer', { name: 'Persisted', billing_email: 'p@test.com' }));
    const rows = await run(list('customer'));
    expect(rows.some((r) => r.name === 'Persisted')).toBe(true);
  });
});

// ── update ──────────────────────────────────────────────────────────────────

describe('update', () => {
  it('updates fields on an existing record', async () => {
    const rec = await run(update('customer', 'cust-001', { name: 'Updated Name' }));
    expect(rec.name).toBe('Updated Name');
    expect(rec.id).toBe('cust-001');
  });

  it('throws NotFoundError for missing ID', async () => {
    await expectReject(update('customer', 'cust-999', { name: 'Nope' }), 'not found');
  });

  it('preserves unmodified fields', async () => {
    const before = await run(getRecord('customer', 'cust-001'));
    const after = await run(update('customer', 'cust-001', { name: 'New Name' }));
    expect(after.name).toBe('New Name');
    expect(after.billing_email).toBe(before.billing_email);
  });

  it('logs a status_changed event when work_order status changes', async () => {
    const eventsBefore = peekEvents().length;
    await run(update('work_order', 'wo-001', { status: 'in_progress' }));
    const eventsAfter = peekEvents();
    expect(eventsAfter.length).toBe(eventsBefore + 1);
    const newEvent = eventsAfter.find(
      (e) => e.event_type === 'status_changed' && e.entity_id === 'wo-001',
    );
    expect(newEvent).toBeDefined();
    if (!newEvent) return;
    expect(newEvent.payload.from).toBe('scheduled');
    expect(newEvent.payload.to).toBe('in_progress');
  });

  it('logs an assigned event when work_order technician_id changes', async () => {
    await run(update('work_order', 'wo-009', { technician_id: 'tech-006' }));
    const events = peekEvents();
    const assigned = events.find((e) => e.event_type === 'assigned' && e.entity_id === 'wo-009');
    expect(assigned).toBeDefined();
  });

  it('does not log assigned event when technician_id is cleared', async () => {
    const eventsBefore = peekEvents().filter((e) => e.event_type === 'assigned').length;
    await run(update('work_order', 'wo-002', { technician_id: '' }));
    const eventsAfter = peekEvents().filter((e) => e.event_type === 'assigned').length;
    expect(eventsAfter).toBe(eventsBefore);
  });

  it('does not log events for non-work_order entity types', async () => {
    const eventsBefore = peekEvents().length;
    await run(update('customer', 'cust-001', { name: 'Updated' }));
    const eventsAfter = peekEvents().length;
    expect(eventsAfter).toBe(eventsBefore);
  });

  it('logs a note_added event when work_order notes change', async () => {
    const eventsBefore = peekEvents().filter((e) => e.event_type === 'note_added').length;
    await run(update('work_order', 'wo-001', { notes: 'New note added here' }));
    const eventsAfter = peekEvents().filter((e) => e.event_type === 'note_added');
    expect(eventsAfter.length).toBe(eventsBefore + 1);
    const newEvent = eventsAfter.find((e) => e.entity_id === 'wo-001');
    expect(newEvent).toBeDefined();
    if (!newEvent) return;
    expect(newEvent.payload.note).toBe('New note added here');
  });
});

// ── remove ──────────────────────────────────────────────────────────────────

describe('remove', () => {
  it('deletes a record', async () => {
    const result = await run(remove('customer', 'cust-008'));
    expect(result.deleted).toBe(true);
    expect(result.id).toBe('cust-008');
  });

  it('removes events for the deleted record', async () => {
    await run(remove('work_order', 'wo-002'));
    const events = peekEvents().filter((e) => e.entity_id === 'wo-002');
    expect(events).toHaveLength(0);
  });

  it('throws NotFoundError for missing ID', async () => {
    await expectReject(remove('customer', 'cust-999'), 'not found');
  });

  it('record no longer appears in list', async () => {
    const before = await run(list('customer'));
    await run(remove('customer', 'cust-008'));
    const after = await run(list('customer'));
    expect(after).toHaveLength(before.length - 1);
    expect(after.find((r) => r.id === 'cust-008')).toBeUndefined();
  });
});

// ── related ─────────────────────────────────────────────────────────────────

describe('related', () => {
  it('returns outbound relations (site → customer)', async () => {
    const result = await run(related('site', 'site-001'));
    expect(result.record.id).toBe('site-001');
    const outbound = result.relations.filter((r) => r.direction === 'outbound');
    expect(outbound).toHaveLength(1);
    expect(outbound[0].rel).toBe('belongs_to');
    expect(outbound[0].type).toBe('customer');
    expect(outbound[0].records).toHaveLength(1);
    expect(outbound[0].records[0].id).toBe('cust-001');
  });

  it('returns inbound relations (customer ← sites)', async () => {
    const result = await run(related('customer', 'cust-001'));
    const inbound = result.relations.filter((r) => r.direction === 'inbound');
    const siteInbound = inbound.find((r) => r.type === 'site');
    expect(siteInbound).toBeDefined();
    if (!siteInbound) return;
    expect(siteInbound.records.length).toBeGreaterThan(0);
  });

  it('returns events for the entity', async () => {
    const result = await run(related('work_order', 'wo-002'));
    expect(result.events.length).toBeGreaterThan(0);
    for (const e of result.events) {
      expect(e.entity_type).toBe('work_order');
      expect(e.entity_id).toBe('wo-002');
    }
  });

  it('throws NotFoundError for missing ID', async () => {
    await expectReject(related('customer', 'cust-999'), 'not found');
  });
});

// ── checkUnique ─────────────────────────────────────────────────────────────

describe('checkUnique', () => {
  it('returns false when value already exists', async () => {
    const isUnique = await run(
      checkUnique('customer', 'billing_email', 'ap@harborviewrealty.example'),
    );
    expect(isUnique).toBe(false);
  });

  it('returns true when value does not exist', async () => {
    const isUnique = await run(checkUnique('customer', 'billing_email', 'unique@example.com'));
    expect(isUnique).toBe(true);
  });

  it('excludes the record with the given excludeId', async () => {
    const isUnique = await run(
      checkUnique('customer', 'billing_email', 'ap@harborviewrealty.example', 'cust-001'),
    );
    expect(isUnique).toBe(true);
  });

  it('returns true for empty values', async () => {
    expect(await run(checkUnique('customer', 'billing_email', ''))).toBe(true);
  });

  it('is case-insensitive', async () => {
    expect(await run(checkUnique('customer', 'billing_email', 'AP@HARBORVIEWREALTY.EXAMPLE'))).toBe(
      false,
    );
  });
});

// ── failNext ────────────────────────────────────────────────────────────────

describe('failNext', () => {
  it('causes the next request to reject with NetworkError', async () => {
    setFailNext(true);
    const p = list('customer');
    p.catch(swallow);
    await vi.advanceTimersByTimeAsync(800);
    await expect(p).rejects.toThrow('Network request failed');
  });

  it('resets after one failure', async () => {
    setFailNext(true);
    const failP = list('customer');
    failP.catch(swallow);
    await vi.advanceTimersByTimeAsync(800);
    await expect(failP).rejects.toThrow('Network request failed');
    // Second call should succeed
    const rows = await run(list('customer'));
    expect(rows.length).toBeGreaterThan(0);
  });
});

// ── reset ───────────────────────────────────────────────────────────────────

describe('reset', () => {
  it('restores seed data', async () => {
    // Create a new record
    await run(create('customer', { name: 'Temp', billing_email: 'temp@test.com' }));
    // Reset
    await run(reset());
    // Verify seed count
    const rows = await run(list('customer'));
    expect(rows).toHaveLength(SEED_COUNTS.customer);
    expect(rows.find((r) => r.name === 'Temp')).toBeUndefined();
  });

  it('clears failNext flag', async () => {
    setFailNext(true);
    await run(reset());
    // Should not throw
    const rows = await run(list('customer'));
    expect(rows.length).toBeGreaterThan(0);
  });
});

// ── peek ────────────────────────────────────────────────────────────────────

describe('peek', () => {
  it('returns all records synchronously', () => {
    for (const type of ENTITY_TYPES) {
      const rows = peek(type);
      expect(rows).toHaveLength(SEED_COUNTS[type]);
    }
  });

  it('returns a clone', () => {
    const rows = peek('customer');
    (rows[0] as Record<string, unknown>).name = 'MUTATED';
    const rows2 = peek('customer');
    expect(rows2[0].name).not.toBe('MUTATED');
  });
});

// ── peekEvents ──────────────────────────────────────────────────────────────

describe('peekEvents', () => {
  it('returns seeded events', () => {
    const events = peekEvents();
    expect(events.length).toBe(27);
  });
});
