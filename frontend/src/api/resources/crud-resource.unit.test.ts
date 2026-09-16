/**
 * MonoBlocks — api/resources/crud-resource.unit.test.ts
 *
 * Unit tests for the CrudResource class.
 */

import { describe, expect, it, vi } from 'vitest';

import type { RequestContext, ResponseContext, Transport } from '@/http/types';

import { CrudResource } from './crud-resource.ts';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRes<T = unknown>(data: T, overrides?: Partial<ResponseContext<T>>): ResponseContext<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    meta: {},
    config: { url: '/api/customers', method: 'GET' },
    ...overrides,
  };
}

/** Creates a mock transport that captures the request context and returns a fixed response. */
function capturingTransport<T = unknown>(
  responseData: T,
  capture?: (ctx: RequestContext) => void,
): Transport {
  return vi.fn<Transport>().mockImplementation(async (ctx) => {
    capture?.(ctx);
    return makeRes(responseData);
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('CrudResource', () => {
  describe('constructor', () => {
    it('prepends /api/ to the base path', () => {
      const t = capturingTransport([]);
      const r = new CrudResource('customers', t);
      expect(r.basePath).toBe('/api/customers');
    });
  });

  describe('list', () => {
    it('calls GET /api/{basePath}', async () => {
      let capturedUrl: string | undefined;
      let capturedMethod: string | undefined;
      const t = capturingTransport([{ id: '1' }], (ctx) => {
        capturedUrl = ctx.config.url;
        capturedMethod = ctx.config.method;
      });

      const r = new CrudResource('customers', t);
      const result = await r.list();

      expect(capturedUrl).toBe('/api/customers');
      expect(capturedMethod).toBe('GET');
      expect(result).toEqual([{ id: '1' }]);
    });

    it('passes search, filter, and sort as query params', async () => {
      let capturedParams: Record<string, unknown> | undefined;
      const t = capturingTransport([], (ctx) => {
        capturedParams = ctx.config.params;
      });

      const r = new CrudResource('customers', t);
      await r.list({
        q: 'acme',
        filters: { status: 'active', region: '' },
        sort: { key: 'name', dir: 'asc' },
      });

      expect(capturedParams).toEqual({
        q: 'acme',
        'filter.status': 'active',
        sortKey: 'name',
        sortDir: 'asc',
      });
      // Empty filter values should be excluded
      expect(capturedParams).not.toHaveProperty('filter.region');
    });

    it('omits empty query params', async () => {
      let capturedParams: Record<string, unknown> | undefined;
      const t = capturingTransport([], (ctx) => {
        capturedParams = ctx.config.params;
      });

      const r = new CrudResource('customers', t);
      await r.list({});

      expect(capturedParams).toEqual({});
    });
  });

  describe('get', () => {
    it('calls GET /api/{basePath}/{id}', async () => {
      let capturedUrl: string | undefined;
      const t = capturingTransport({ id: '1', name: 'Alice' }, (ctx) => {
        capturedUrl = ctx.config.url;
      });

      const r = new CrudResource('customers', t);
      const result = await r.get('1');

      expect(capturedUrl).toBe('/api/customers/1');
      expect(result).toEqual({ id: '1', name: 'Alice' });
    });

    it('passes signal in config', async () => {
      let capturedSignal: AbortSignal | undefined;
      const t = capturingTransport({ id: '1' }, (ctx) => {
        capturedSignal = ctx.config.signal;
      });

      const controller = new AbortController();
      const r = new CrudResource('customers', t);
      await r.get('1', { signal: controller.signal });

      expect(capturedSignal).toBe(controller.signal);
    });
  });

  describe('create', () => {
    it('calls POST /api/{basePath} with values as data', async () => {
      let capturedMethod: string | undefined;
      let capturedData: unknown;
      const t = capturingTransport({ id: '2', name: 'Bob' }, (ctx) => {
        capturedMethod = ctx.config.method;
        capturedData = ctx.config.data;
      });

      const r = new CrudResource('customers', t);
      const result = await r.create({ name: 'Bob' });

      expect(capturedMethod).toBe('POST');
      expect(capturedData).toEqual({ name: 'Bob' });
      expect(result).toEqual({ id: '2', name: 'Bob' });
    });
  });

  describe('update', () => {
    it('calls PATCH /api/{basePath}/{id} with values as data', async () => {
      let capturedMethod: string | undefined;
      let capturedUrl: string | undefined;
      let capturedData: unknown;
      const t = capturingTransport({ id: '1', name: 'Updated' }, (ctx) => {
        capturedMethod = ctx.config.method;
        capturedUrl = ctx.config.url;
        capturedData = ctx.config.data;
      });

      const r = new CrudResource('customers', t);
      const result = await r.update('1', { name: 'Updated' });

      expect(capturedMethod).toBe('PATCH');
      expect(capturedUrl).toBe('/api/customers/1');
      expect(capturedData).toEqual({ name: 'Updated' });
      expect(result).toEqual({ id: '1', name: 'Updated' });
    });
  });

  describe('remove', () => {
    it('calls DELETE /api/{basePath}/{id}', async () => {
      let capturedMethod: string | undefined;
      let capturedUrl: string | undefined;
      const t = capturingTransport({ deleted: true, id: '1' }, (ctx) => {
        capturedMethod = ctx.config.method;
        capturedUrl = ctx.config.url;
      });

      const r = new CrudResource('customers', t);
      const result = await r.remove('1');

      expect(capturedMethod).toBe('DELETE');
      expect(capturedUrl).toBe('/api/customers/1');
      expect(result).toEqual({ deleted: true, id: '1' });
    });
  });

  describe('related', () => {
    it('calls GET /api/{basePath}/{id}/related', async () => {
      let capturedUrl: string | undefined;
      const relatedData = { record: { id: '1' }, relations: [], events: [] };
      const t = capturingTransport(relatedData, (ctx) => {
        capturedUrl = ctx.config.url;
      });

      const r = new CrudResource('customers', t);
      const result = await r.related('1');

      expect(capturedUrl).toBe('/api/customers/1/related');
      expect(result).toEqual(relatedData);
    });
  });

  describe('checkUnique', () => {
    it('calls GET /api/{basePath}/check-unique with key/value params', async () => {
      let capturedUrl: string | undefined;
      let capturedParams: Record<string, unknown> | undefined;
      const t = capturingTransport(true, (ctx) => {
        capturedUrl = ctx.config.url;
        capturedParams = ctx.config.params;
      });

      const r = new CrudResource('customers', t);
      const result = await r.checkUnique('email', 'alice@example.com');

      expect(capturedUrl).toBe('/api/customers/check-unique');
      expect(capturedParams).toEqual({ key: 'email', value: 'alice@example.com' });
      expect(result).toBe(true);
    });

    it('includes excludeId when provided', async () => {
      let capturedParams: Record<string, unknown> | undefined;
      const t = capturingTransport(true, (ctx) => {
        capturedParams = ctx.config.params;
      });

      const r = new CrudResource('customers', t);
      await r.checkUnique('email', 'alice@example.com', '1');

      expect(capturedParams).toEqual({
        key: 'email',
        value: 'alice@example.com',
        excludeId: '1',
      });
    });

    it('omits excludeId when not provided', async () => {
      let capturedParams: Record<string, unknown> | undefined;
      const t = capturingTransport(true, (ctx) => {
        capturedParams = ctx.config.params;
      });

      const r = new CrudResource('customers', t);
      await r.checkUnique('email', 'alice@example.com');

      expect(capturedParams).not.toHaveProperty('excludeId');
    });
  });
});
