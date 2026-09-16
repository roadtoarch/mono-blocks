/**
 * MonoBlocks — http/resource.unit.test.ts
 *
 * Unit tests for the Resource base class.
 */

import { describe, expect, it, vi } from 'vitest';

import { Resource } from './resource.ts';

import type { RequestContext, ResponseContext, Transport } from './types.ts';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRes<T = unknown>(
  data: T,
  overrides?: Partial<ResponseContext<T>>,
): ResponseContext<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    meta: {},
    config: { url: '/test', method: 'GET' },
    ...overrides,
  };
}

function mockTransport(response: ResponseContext): Transport {
  return vi.fn<Transport>().mockResolvedValue(response);
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Resource', () => {
  describe('constructor', () => {
    it('stores basePath and transport', () => {
      const t = mockTransport(makeRes({}));
      const r = new Resource('/api/test', t);
      expect(r.basePath).toBe('/api/test');
      expect(r.transport).toBe(t);
    });
  });

  describe('request', () => {
    it('builds URL from basePath + path', async () => {
      let capturedUrl: string | undefined;
      const t: Transport = async (ctx) => {
        capturedUrl = ctx.config.url;
        return makeRes('data');
      };

      const r = new Resource('/api/users', t);
      // Access protected method via subclass
      class TestResource extends Resource {
        async doIt() {
          return this.request('GET', '123');
        }
      }
      const tr = new TestResource('/api/users', t);
      await tr.doIt();

      expect(capturedUrl).toBe('/api/users/123');
    });

    it('uses basePath when path is empty', async () => {
      let capturedUrl: string | undefined;
      const t: Transport = async (ctx) => {
        capturedUrl = ctx.config.url;
        return makeRes('data');
      };

      class TestResource extends Resource {
        async doIt() {
          return this.request('GET', '');
        }
      }
      const tr = new TestResource('/api/users', t);
      await tr.doIt();

      expect(capturedUrl).toBe('/api/users');
    });

    it('sets Content-Type header', async () => {
      let capturedHeaders: Record<string, string> | undefined;
      const t: Transport = async (ctx) => {
        capturedHeaders = ctx.config.headers;
        return makeRes('data');
      };

      class TestResource extends Resource {
        async doIt() {
          return this.request('GET', '');
        }
      }
      const tr = new TestResource('/api/users', t);
      await tr.doIt();

      expect(capturedHeaders?.['Content-Type']).toBe('application/json');
    });

    it('returns response data', async () => {
      const t = mockTransport(makeRes({ id: '1', name: 'Alice' }));

      class TestResource extends Resource {
        async doIt() {
          return this.request<{ id: string; name: string }>('GET', '');
        }
      }
      const tr = new TestResource('/api/users', t);
      const result = await tr.doIt();

      expect(result).toEqual({ id: '1', name: 'Alice' });
    });

    it('initializes empty meta on context', async () => {
      let capturedMeta: Record<string, unknown> | undefined;
      const t: Transport = async (ctx) => {
        capturedMeta = ctx.meta;
        return makeRes('ok');
      };

      class TestResource extends Resource {
        async doIt() {
          return this.request('GET', '');
        }
      }
      const tr = new TestResource('/api/users', t);
      await tr.doIt();

      expect(capturedMeta).toEqual({});
    });
  });

  describe('get', () => {
    it('calls request with GET method', async () => {
      let capturedMethod: string | undefined;
      const t: Transport = async (ctx) => {
        capturedMethod = ctx.config.method;
        return makeRes({ id: '1' });
      };

      class TestResource extends Resource {
        async doGet() {
          return this.get('1');
        }
      }
      const tr = new TestResource('/api/users', t);
      const result = await tr.doGet();

      expect(capturedMethod).toBe('GET');
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('post', () => {
    it('calls request with POST method and data', async () => {
      let capturedData: unknown;
      const t: Transport = async (ctx) => {
        capturedData = ctx.config.data;
        return makeRes({ id: '2' }, { status: 201 });
      };

      class TestResource extends Resource {
        async doPost() {
          return this.post('', { name: 'Bob' });
        }
      }
      const tr = new TestResource('/api/users', t);
      const result = await tr.doPost();

      expect(capturedData).toEqual({ name: 'Bob' });
      expect(result).toEqual({ id: '2' });
    });
  });

  describe('patch', () => {
    it('returns data on 200', async () => {
      const t = mockTransport(makeRes({ id: '1', name: 'Updated' }));

      class TestResource extends Resource {
        async doPatch() {
          return this.patch('1', { name: 'Updated' });
        }
      }
      const tr = new TestResource('/api/users', t);
      const result = await tr.doPatch();

      expect(result).toEqual({ id: '1', name: 'Updated' });
    });

    it('returns undefined when response data is null (204 No Content)', async () => {
      const t: Transport = async () => ({
        data: null,
        status: 204,
        statusText: 'No Content',
        headers: {},
        meta: {},
        config: { url: '/api/users/1', method: 'PATCH' },
      });

      class TestResource extends Resource {
        async doPatch() {
          return this.patch('1', { name: 'Updated' });
        }
      }
      const tr = new TestResource('/api/users', t);
      const result = await tr.doPatch();

      expect(result).toBeUndefined();
    });
  });

  describe('del', () => {
    it('returns undefined when response data is null (204 No Content)', async () => {
      const t: Transport = async () => ({
        data: null,
        status: 204,
        statusText: 'No Content',
        headers: {},
        meta: {},
        config: { url: '/api/users/1', method: 'DELETE' },
      });

      class TestResource extends Resource {
        async doDel() {
          return this.del('1');
        }
      }
      const tr = new TestResource('/api/users', t);
      const result = await tr.doDel();

      expect(result).toBeUndefined();
    });

    it('returns data when response has a body', async () => {
      const t = mockTransport(makeRes({ deleted: true, id: '1' }));

      class TestResource extends Resource {
        async doDel() {
          return this.del('1');
        }
      }
      const tr = new TestResource('/api/users', t);
      const result = await tr.doDel();

      expect(result).toEqual({ deleted: true, id: '1' });
    });
  });
});
