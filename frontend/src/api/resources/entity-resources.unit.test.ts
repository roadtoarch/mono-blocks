/**
 * MonoBlocks — api/resources/entity-resources.unit.test.ts
 *
 * Unit tests for the concrete entity resource classes.
 */

import { describe, expect, it, vi } from 'vitest';

import type { Transport } from '@/http/types';

import {
  CustomerResource,
  EquipmentResource,
  SiteResource,
  TechnicianResource,
  WorkOrderResource,
} from './entity-resources.ts';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** A transport that always returns empty data. */
const stubTransport: Transport = vi.fn().mockResolvedValue({
  data: [],
  status: 200,
  statusText: 'OK',
  headers: {},
  meta: {},
  config: { url: '/', method: 'GET' },
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe('entity resource classes', () => {
  it('CustomerResource extends CrudResource with basePath /api/customers', () => {
    const r = new CustomerResource(stubTransport);
    expect(r.basePath).toBe('/api/customers');
  });

  it('SiteResource extends CrudResource with basePath /api/sites', () => {
    const r = new SiteResource(stubTransport);
    expect(r.basePath).toBe('/api/sites');
  });

  it('EquipmentResource extends CrudResource with basePath /api/equipment', () => {
    const r = new EquipmentResource(stubTransport);
    expect(r.basePath).toBe('/api/equipment');
  });

  it('TechnicianResource extends CrudResource with basePath /api/technicians', () => {
    const r = new TechnicianResource(stubTransport);
    expect(r.basePath).toBe('/api/technicians');
  });

  it('WorkOrderResource extends CrudResource with basePath /api/work-orders', () => {
    const r = new WorkOrderResource(stubTransport);
    expect(r.basePath).toBe('/api/work-orders');
  });

  it('each resource class uses the provided transport', () => {
    const customTransport: Transport = vi.fn().mockResolvedValue({
      data: [],
      status: 200,
      statusText: 'OK',
      headers: {},
      meta: {},
      config: { url: '/', method: 'GET' },
    });

    const r = new CustomerResource(customTransport);
    expect(r.transport).toBe(customTransport);
  });
});
