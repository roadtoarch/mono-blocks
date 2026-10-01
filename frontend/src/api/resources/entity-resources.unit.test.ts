/**
 * MonoBlocks — api/resources/entity-resources.unit.test.ts
 *
 * Unit tests for the concrete entity resource classes.
 */

import { describe, expect, it, vi } from 'vitest';

import {
  CustomerResource,
  EquipmentResource,
  SiteResource,
  TechnicianResource,
  WorkOrderResource,
} from './entity-resources.ts';

import type { Transport } from '@/http/types';

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
  it('CustomerResource targets /api/entities for the customer type', () => {
    const r = new CustomerResource(stubTransport);
    expect(r.basePath).toBe('/api/entities');
    expect(r.entityType).toBe('customer');
  });

  it('SiteResource targets /api/entities for the site type', () => {
    const r = new SiteResource(stubTransport);
    expect(r.basePath).toBe('/api/entities');
    expect(r.entityType).toBe('site');
  });

  it('EquipmentResource targets /api/entities for the equipment type', () => {
    const r = new EquipmentResource(stubTransport);
    expect(r.basePath).toBe('/api/entities');
    expect(r.entityType).toBe('equipment');
  });

  it('TechnicianResource targets /api/entities for the technician type', () => {
    const r = new TechnicianResource(stubTransport);
    expect(r.basePath).toBe('/api/entities');
    expect(r.entityType).toBe('technician');
  });

  it('WorkOrderResource targets /api/entities for the work_order type', () => {
    const r = new WorkOrderResource(stubTransport);
    expect(r.basePath).toBe('/api/entities');
    expect(r.entityType).toBe('work_order');
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
