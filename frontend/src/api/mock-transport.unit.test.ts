/**
 * MonoBlocks — api/mock-transport.unit.test.ts
 *
 * Unit tests for the mock transport that adapts mockDb to the Transport
 * interface using the same protocol as the live generic core API.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockTransport } from './mock-transport.ts';
import * as mockDb from './mockDb.ts';

import type { RequestContext } from '@/http/types';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('./mockDb.ts', () => ({
  list: vi.fn().mockResolvedValue([
    { id: '1', name: 'A' },
    { id: '2', name: 'B' },
  ]),
  getRecord: vi.fn().mockResolvedValue({ id: '1', name: 'Alice' }),
  create: vi.fn().mockResolvedValue({ id: '2', name: 'Bob' }),
  update: vi.fn().mockResolvedValue({ id: '1', name: 'Updated' }),
  remove: vi.fn().mockResolvedValue({ deleted: true, id: '1' }),
  checkUnique: vi.fn().mockResolvedValue(true),
  peek: vi.fn((type: string) => (type === 'customer' ? [{ id: '1' }] : [])),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    config: { url: '/api/entities', method: 'GET', ...overrides.config },
    meta: {},
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('mockTransport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET list', () => {
    it('routes GET /api/entities → list() wrapped in a Spring Page', async () => {
      const ctx = makeCtx({
        config: {
          url: '/api/entities',
          method: 'GET',
          params: { entity_type: 'customer', page: 0, size: 10 },
        },
      });
      const result = await mockTransport(ctx);

      expect(mockDb.list).toHaveBeenCalledWith('customer', {
        q: undefined,
        filters: undefined,
        sort: undefined,
      });
      const page = result.data as { content: unknown[]; totalElements: number };
      expect(page.content).toHaveLength(2);
      expect(page.totalElements).toBe(2);
      expect(result.status).toBe(200);
    });

    it('translates search/status/sort params', async () => {
      const ctx = makeCtx({
        config: {
          url: '/api/entities',
          method: 'GET',
          params: {
            entity_type: 'customer',
            search: 'acme',
            status: 'active',
            sort: 'name,asc',
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

    it('slices content according to page/size', async () => {
      const ctx = makeCtx({
        config: {
          url: '/api/entities',
          method: 'GET',
          params: { entity_type: 'customer', page: 1, size: 1 },
        },
      });
      const result = await mockTransport(ctx);
      const page = result.data as { content: unknown[]; number: number; totalPages: number };

      expect(page.content).toHaveLength(1);
      expect(page.number).toBe(1);
      expect(page.totalPages).toBe(2);
    });

    it('rejects a missing / unknown entity_type', async () => {
      const ctx = makeCtx({
        config: { url: '/api/entities', method: 'GET', params: {} },
      });
      await expect(mockTransport(ctx)).rejects.toThrow('unknown entity_type');
    });

    it('strips the baseURL prefix', async () => {
      const ctx = makeCtx({
        config: {
          url: 'http://localhost:8080/api/entities',
          method: 'GET',
          params: { entity_type: 'customer' },
        },
      });
      await mockTransport(ctx);
      expect(mockDb.list).toHaveBeenCalled();
    });
  });

  describe('GET item / sub-resources', () => {
    it('routes GET /api/entities/{id} → getRecord()', async () => {
      const ctx = makeCtx({ config: { url: '/api/entities/1', method: 'GET' } });
      const result = await mockTransport(ctx);

      expect(mockDb.getRecord).toHaveBeenCalledWith('customer', '1');
      expect(result.data).toEqual({ id: '1', name: 'Alice' });
    });

    it('returns an empty Page for relationships', async () => {
      const ctx = makeCtx({ config: { url: '/api/entities/1/relationships', method: 'GET' } });
      const result = await mockTransport(ctx);
      const page = result.data as { content: unknown[]; totalElements: number };
      expect(page.content).toEqual([]);
      expect(page.totalElements).toBe(0);
    });

    it('returns an empty Page for events', async () => {
      const ctx = makeCtx({ config: { url: '/api/entities/1/events', method: 'GET' } });
      const result = await mockTransport(ctx);
      expect((result.data as { content: unknown[] }).content).toEqual([]);
    });

    it('returns present entity types', async () => {
      const ctx = makeCtx({ config: { url: '/api/entities/types', method: 'GET' } });
      const result = await mockTransport(ctx);
      expect(result.data).toEqual(['customer']);
    });

    it('routes check-unique with entity_type', async () => {
      const ctx = makeCtx({
        config: {
          url: '/api/entities/check-unique',
          method: 'GET',
          params: { entity_type: 'customer', key: 'billing_email', value: 'a@b.com' },
        },
      });
      const result = await mockTransport(ctx);

      expect(mockDb.checkUnique).toHaveBeenCalledWith(
        'customer',
        'billing_email',
        'a@b.com',
        undefined,
      );
      expect(result.data).toEqual({ unique: true });
    });
  });

  describe('writes', () => {
    it('routes POST /api/entities → create() with 201', async () => {
      const ctx = makeCtx({
        config: {
          url: '/api/entities',
          method: 'POST',
          data: { entity_type: 'customer', name: 'Bob' },
        },
      });
      const result = await mockTransport(ctx);

      expect(mockDb.create).toHaveBeenCalledWith('customer', {
        entity_type: 'customer',
        name: 'Bob',
      });
      expect(result.status).toBe(201);
    });

    it('routes PATCH /api/entities/{id} → update()', async () => {
      const ctx = makeCtx({
        config: { url: '/api/entities/1', method: 'PATCH', data: { name: 'Updated' } },
      });
      const result = await mockTransport(ctx);

      expect(mockDb.update).toHaveBeenCalledWith('customer', '1', { name: 'Updated' });
      expect(result.data).toEqual({ id: '1', name: 'Updated' });
    });

    it('routes DELETE /api/entities/{id} → remove() with 204 and no body', async () => {
      const ctx = makeCtx({ config: { url: '/api/entities/1', method: 'DELETE' } });
      const result = await mockTransport(ctx);

      expect(mockDb.remove).toHaveBeenCalledWith('customer', '1');
      expect(result.status).toBe(204);
      expect(result.data).toBeUndefined();
    });

    it('throws for PUT', async () => {
      const ctx = makeCtx({ config: { url: '/api/entities/1', method: 'PUT' } });
      await expect(mockTransport(ctx)).rejects.toThrow('unsupported method');
    });
  });

  describe('unknown resource', () => {
    it('throws for an unknown resource segment', async () => {
      const ctx = makeCtx({ config: { url: '/api/unknown', method: 'GET' } });
      await expect(mockTransport(ctx)).rejects.toThrow('unknown resource');
    });
  });
});
