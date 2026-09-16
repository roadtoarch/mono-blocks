/**
 * MonoBlocks — api/resources/entity-resource-factory.unit.test.ts
 *
 * Unit tests for the entity resource factory.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { EntityType } from '@/schema/types';

import { clearResourceCache, getEntityResource } from './entity-resource-factory.ts';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('getEntityResource', () => {
  beforeEach(() => {
    clearResourceCache();
  });

  it('returns a CrudResource for each entity type', () => {
    const types: EntityType[] = ['customer', 'site', 'equipment', 'technician', 'work_order'];

    for (const type of types) {
      const resource = getEntityResource(type);
      expect(resource).toBeDefined();
      expect(resource.basePath).toMatch(/^\/api\//);
    }
  });

  it('caches resources per type (same instance without explicit transport)', () => {
    const r1 = getEntityResource('customer');
    const r2 = getEntityResource('customer');
    expect(r1).toBe(r2);
  });

  it('returns different instances for different types', () => {
    const r1 = getEntityResource('customer');
    const r2 = getEntityResource('site');
    expect(r1).not.toBe(r2);
    expect(r1.basePath).not.toBe(r2.basePath);
  });

  it('creates a new resource when transport is explicitly provided', () => {
    const r1 = getEntityResource('customer');
    const customTransport = vi.fn();
    const r2 = getEntityResource('customer', customTransport as any);

    expect(r1).not.toBe(r2);
    expect(r2.transport).toBe(customTransport);
  });

  it('uses correct base paths for each entity type', () => {
    const expectations: Record<EntityType, string> = {
      customer: '/api/customers',
      site: '/api/sites',
      equipment: '/api/equipment',
      technician: '/api/technicians',
      work_order: '/api/work-orders',
    };

    for (const [type, expectedPath] of Object.entries(expectations)) {
      const resource = getEntityResource(type as EntityType);
      expect(resource.basePath).toBe(expectedPath);
    }
  });
});

describe('clearResourceCache', () => {
  it('clears cached resources so next call creates new instances', () => {
    const r1 = getEntityResource('customer');
    clearResourceCache();
    const r2 = getEntityResource('customer');
    expect(r1).not.toBe(r2);
  });
});
