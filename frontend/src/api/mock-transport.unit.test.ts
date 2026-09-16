/**
 * MonoBlocks — api/mock-transport.unit.test.ts
 *
 * Unit tests for the mock transport that adapts mockDb to the Transport interface.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RequestContext } from '@/http/types';

import * as mockDb from './mockDb.ts';

import { mockTransport } from './mock-transport.ts';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('./mockDb.ts', () => ({
  list: vi.fn().mockResolvedValue([{ id: '1' }]),
  getRecord: vi.fn().mockResolvedValue({ id: '1', name: 'Alice' }),
  create: vi.fn().mockResolvedValue({ id: '2', name: 'Bob' }),
  update: vi.fn().mockResolvedValue({ id: '1', name: 'Updated' }),
  remove: vi.fn().mockResolvedValue({ deleted: true, id: '1' }),
  related: vi.fn().mockResolvedValue({ record: { id: '1' }, relations: [], events: [] }),
  checkUnique: vi.fn().mockResolvedValue(true),
  reset: vi.fn().mockResolvedValue({ reset: true }),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    config: { url: '/api/customers', method: 'GET', ...overrides.config },
    meta: {},
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('mockTransport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('routes GET /api/customers → list()', async () => {
      const ctx = makeCtx({ config: { url: '/api/customers', method: 'GET', params: {} } });
      const result = await mockTransport(ctx);

      expect(mockDb.list).toHaveBeenCalledWith('customer', {});
      expect(result.data).toEqual([{ id: '1' }]);
      expect(result.status).toBe(200);
    });

    it('routes GET /api/customers/1 → getRecord()', async () => {
      const ctx = makeCtx({ config: { url: '/api/customers/1', method: 'GET' } });
      const result = await mockTransport(ctx);

      expect(mockDb.getRecord).toHaveBeenCalledWith('customer', '1');
      expect(result.data).toEqual({ id: '1', name: 'Alice' });
    });

    it('routes GET /api/customers/1/related → related()', async () => {
      const ctx = makeCtx({ config: { url: '/api/customers/1/related', method: 'GET' } });
      const result = await mockTransport(ctx);

      expect(mockDb.related).toHaveBeenCalledWith('customer', '1');
      expect(result.data).toEqual({ record: { id: '1' }, relations: [], events: [] });
    });

    it('routes GET /api/customers/check-unique → checkUnique()', async () => {
      const ctx = makeCtx({
        config: {
          url: '/api/customers/check-unique',
          method: 'GET',
          params: { key: 'email', value: 'a@b.com', excludeId: '1' },
        },
      });
      const result = await mockTransport(ctx);

      expect(mockDb.checkUnique).toHaveBeenCalledWith('customer', 'email', 'a@b.com', '1');
      expect(result.data).toBe(true);
    });

    it('passes list options as query params', async () => {
      const ctx = makeCtx({
        config: {
          url: '/api/customers',
          method: 'GET',
          params: {
            q: 'acme',
            'filter.status': 'active',
            sortKey: 'name',
            sortDir: 'asc',
          },
        },
      });
      await mockTransport(ctx);

      expect(mockDb.list).toHaveBeenCalledWith('customer', {
        q: 'acme',
        filters: { status: 'active' },
        sort: { key: 'name', dir: 'asc' },
      });
    });

    it('handles work-orders collection → work_order type', async () => {
      const ctx = makeCtx({ config: { url: '/api/work-orders', method: 'GET', params: {} } });
      await mockTransport(ctx);

      expect(mockDb.list).toHaveBeenCalledWith('work_order', {});
    });

    it('strips baseURL prefix from URL', async () => {
      const ctx = makeCtx({ config: { url: 'http://localhost:8080/api/customers', method: 'GET', params: {} } });
      await mockTransport(ctx);

      expect(mockDb.list).toHaveBeenCalled();
    });
  });

  describe('POST', () => {
    it('routes POST /api/customers → create()', async () => {
      const ctx = makeCtx({
        config: { url: '/api/customers', method: 'POST', data: { name: 'Bob' } },
      });
      const result = await mockTransport(ctx);

      expect(mockDb.create).toHaveBeenCalledWith('customer', { name: 'Bob' });
      expect(result.status).toBe(201);
      expect(result.data).toEqual({ id: '2', name: 'Bob' });
    });

    it('routes POST /api/reset → reset()', async () => {
      const ctx = makeCtx({
        config: { url: 'http://localhost:8080/api/reset', method: 'POST' },
      });
      const result = await mockTransport(ctx);

      expect(mockDb.reset).toHaveBeenCalled();
      expect(result.data).toEqual({ reset: true });
    });
  });

  describe('PATCH', () => {
    it('routes PATCH /api/customers/1 → update()', async () => {
      const ctx = makeCtx({
        config: { url: '/api/customers/1', method: 'PATCH', data: { name: 'Updated' } },
      });
      const result = await mockTransport(ctx);

      expect(mockDb.update).toHaveBeenCalledWith('customer', '1', { name: 'Updated' });
      expect(result.data).toEqual({ id: '1', name: 'Updated' });
    });

    it('throws if PATCH has no ID', async () => {
      const ctx = makeCtx({ config: { url: '/api/customers', method: 'PATCH', data: {} } });

      await expect(mockTransport(ctx)).rejects.toThrow('PATCH requires an ID');
    });
  });

  describe('DELETE', () => {
    it('routes DELETE /api/customers/1 → remove()', async () => {
      const ctx = makeCtx({ config: { url: '/api/customers/1', method: 'DELETE' } });
      const result = await mockTransport(ctx);

      expect(mockDb.remove).toHaveBeenCalledWith('customer', '1');
      expect(result.data).toEqual({ deleted: true, id: '1' });
    });

    it('throws if DELETE has no ID', async () => {
      const ctx = makeCtx({ config: { url: '/api/customers', method: 'DELETE' } });

      await expect(mockTransport(ctx)).rejects.toThrow('DELETE requires an ID');
    });
  });

  describe('unsupported method', () => {
    it('throws for PUT', async () => {
      const ctx = makeCtx({ config: { url: '/api/customers', method: 'PUT' } });

      await expect(mockTransport(ctx)).rejects.toThrow('unsupported method');
    });
  });

  describe('unknown collection', () => {
    it('throws for unknown collection segment', async () => {
      const ctx = makeCtx({ config: { url: '/api/unknown', method: 'GET', params: {} } });

      await expect(mockTransport(ctx)).rejects.toThrow('unknown collection');
    });
  });

  describe('response shape', () => {
    it('preserves ctx.meta in response', async () => {
      const ctx = makeCtx({
        config: { url: '/api/customers', method: 'GET', params: {} },
        meta: { traceId: 'abc' },
      });
      const result = await mockTransport(ctx);

      expect(result.meta.traceId).toBe('abc');
    });

    it('includes config in response', async () => {
      const ctx = makeCtx({ config: { url: '/api/customers', method: 'GET', params: {} } });
      const result = await mockTransport(ctx);

      expect(result.config).toBe(ctx.config);
    });
  });
});
