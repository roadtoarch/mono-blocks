/**
 * MonoBlocks — api/resources/crud-resource.unit.test.ts
 *
 * Unit tests for the CrudResource class against the generic core protocol.
 */

import { describe, expect, it, vi } from 'vitest';

import { CrudResource, normalizePage } from './crud-resource.ts';

import type { RequestContext, ResponseContext, Transport } from '@/http/types';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRes(data: unknown, overrides?: Partial<ResponseContext>): ResponseContext {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    meta: {},
    config: { url: '/api/entities', method: 'GET' },
    ...overrides,
  };
}

/** Creates a mock transport that captures the request context and returns a fixed response. */
function capturingTransport(
  responseData: unknown,
  capture?: (ctx: RequestContext) => void,
): Transport {
  return vi.fn<Transport>().mockImplementation(async (ctx) => {
    capture?.(ctx);
    return makeRes(responseData);
  });
}

const EMPTY_PAGE = {
  content: [],
  empty: true,
  first: true,
  last: true,
  number: 0,
  numberOfElements: 0,
  pageable: {
    offset: 0,
    pageNumber: 0,
    pageSize: 10,
    paged: true,
    unpaged: false,
    sort: { empty: true, sorted: false, unsorted: true },
  },
  size: 10,
  sort: { empty: true, sorted: false, unsorted: true },
  totalElements: 0,
  totalPages: 0,
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe('CrudResource', () => {
  describe('constructor', () => {
    it('uses the single entities collection and records its entity type', () => {
      const t = capturingTransport(EMPTY_PAGE);
      const r = new CrudResource('customer', t);
      expect(r.basePath).toBe('/api/entities');
      expect(r.entityType).toBe('customer');
    });
  });

  describe('list', () => {
    it('calls GET /api/entities with entity_type, page and size', async () => {
      let capturedUrl: string | undefined;
      let capturedMethod: string | undefined;
      let capturedParams: Record<string, unknown> | undefined;
      const t = capturingTransport(EMPTY_PAGE, (ctx) => {
        capturedUrl = ctx.config.url;
        capturedMethod = ctx.config.method;
        capturedParams = ctx.config.params;
      });

      const r = new CrudResource('customer', t);
      const result = await r.list();

      expect(capturedUrl).toBe('/api/entities');
      expect(capturedMethod).toBe('GET');
      expect(capturedParams).toEqual({ entity_type: 'customer', page: 0, size: 10 });
      expect(result).toEqual(EMPTY_PAGE);
    });

    it('maps search, status, paging and a sortable sort to Spring params', async () => {
      let capturedParams: Record<string, unknown> | undefined;
      const t = capturingTransport(EMPTY_PAGE, (ctx) => {
        capturedParams = ctx.config.params;
      });

      const r = new CrudResource('customer', t);
      await r.list({
        search: 'acme',
        status: 'active',
        page: 2,
        size: 20,
        sort: { key: 'name', dir: 'desc' },
      });

      expect(capturedParams).toEqual({
        entity_type: 'customer',
        page: 2,
        size: 20,
        search: 'acme',
        status: 'active',
        sort: 'name,desc',
      });
    });

    it('drops sort keys the backend cannot sort by', async () => {
      let capturedParams: Record<string, unknown> | undefined;
      const t = capturingTransport(EMPTY_PAGE, (ctx) => {
        capturedParams = ctx.config.params;
      });

      const r = new CrudResource('customer', t);
      await r.list({ sort: { key: 'billing_email', dir: 'asc' } });

      expect(capturedParams).not.toHaveProperty('sort');
    });

    it('maps geo filters to snake_case params', async () => {
      let capturedParams: Record<string, unknown> | undefined;
      const t = capturingTransport(EMPTY_PAGE, (ctx) => {
        capturedParams = ctx.config.params;
      });

      const r = new CrudResource('site', t);
      await r.list({ geo: { lat: 49.2, lng: -123, radiusKm: 5 } });

      expect(capturedParams).toMatchObject({ lat: 49.2, lng: -123, radius_km: 5 });
    });

    it('omits empty optional params', async () => {
      let capturedParams: Record<string, unknown> | undefined;
      const t = capturingTransport(EMPTY_PAGE, (ctx) => {
        capturedParams = ctx.config.params;
      });

      const r = new CrudResource('customer', t);
      await r.list({});

      expect(capturedParams).toEqual({ entity_type: 'customer', page: 0, size: 10 });
    });
  });

  describe('get', () => {
    it('calls GET /api/entities/{id}', async () => {
      let capturedUrl: string | undefined;
      const t = capturingTransport({ id: '1', name: 'Alice' }, (ctx) => {
        capturedUrl = ctx.config.url;
      });

      const r = new CrudResource('customer', t);
      const result = await r.get('1');

      expect(capturedUrl).toBe('/api/entities/1');
      expect(result).toEqual({ id: '1', name: 'Alice' });
    });

    it('passes signal in config', async () => {
      let capturedSignal: AbortSignal | undefined;
      const t = capturingTransport({ id: '1' }, (ctx) => {
        capturedSignal = ctx.config.signal;
      });

      const controller = new AbortController();
      const r = new CrudResource('customer', t);
      await r.get('1', { signal: controller.signal });

      expect(capturedSignal).toBe(controller.signal);
    });
  });

  describe('create', () => {
    it('calls POST /api/entities and injects entity_type', async () => {
      let capturedMethod: string | undefined;
      let capturedData: unknown;
      const t = capturingTransport({ id: '2', name: 'Bob' }, (ctx) => {
        capturedMethod = ctx.config.method;
        capturedData = ctx.config.data;
      });

      const r = new CrudResource('customer', t);
      const result = await r.create({ name: 'Bob' });

      expect(capturedMethod).toBe('POST');
      expect(capturedData).toEqual({ name: 'Bob', entity_type: 'customer' });
      expect(result).toEqual({ id: '2', name: 'Bob' });
    });

    it('defaults the required name from the title field for entities without a name field', async () => {
      let capturedData: Record<string, unknown> | undefined;
      const t = capturingTransport({ id: 'e1' }, (ctx) => {
        capturedData = ctx.config.data as Record<string, unknown>;
      });

      const r = new CrudResource('equipment', t);
      await r.create({ serial_number: 'HVAC-1' });

      expect(capturedData).toEqual({
        serial_number: 'HVAC-1',
        name: 'HVAC-1',
        entity_type: 'equipment',
      });
    });
  });

  describe('update', () => {
    it('calls PATCH /api/entities/{id} with flat values', async () => {
      let capturedMethod: string | undefined;
      let capturedUrl: string | undefined;
      let capturedData: unknown;
      const t = capturingTransport({ id: '1', name: 'Updated' }, (ctx) => {
        capturedMethod = ctx.config.method;
        capturedUrl = ctx.config.url;
        capturedData = ctx.config.data;
      });

      const r = new CrudResource('customer', t);
      const result = await r.update('1', { name: 'Updated' });

      expect(capturedMethod).toBe('PATCH');
      expect(capturedUrl).toBe('/api/entities/1');
      expect(capturedData).toEqual({ name: 'Updated' });
      expect(result).toEqual({ id: '1', name: 'Updated' });
    });
  });

  describe('remove', () => {
    it('calls DELETE /api/entities/{id} and resolves undefined for 204', async () => {
      let capturedMethod: string | undefined;
      let capturedUrl: string | undefined;
      const t = vi.fn<Transport>().mockImplementation(async (ctx) => {
        capturedMethod = ctx.config.method;
        capturedUrl = ctx.config.url;
        return makeRes(undefined, { status: 204, statusText: 'No Content' });
      });

      const r = new CrudResource('customer', t);
      await expect(r.remove('1')).resolves.toBeUndefined();

      expect(capturedMethod).toBe('DELETE');
      expect(capturedUrl).toBe('/api/entities/1');
    });
  });

  describe('related', () => {
    it('composes entity + relationships + events from the real endpoints', async () => {
      const urls: string[] = [];
      const t: Transport = vi.fn<Transport>().mockImplementation(async (ctx) => {
        urls.push(ctx.config.url);
        if (ctx.config.url.endsWith('/relationships')) {
          return makeRes({
            ...EMPTY_PAGE,
            content: [
              {
                id: 'rel-1',
                source_id: '1',
                target_id: 's1',
                relationship_type: 'belongs_to',
                attributes: null,
                created_at: '2026-01-01T00:00:00Z',
                direction: 'outbound',
                other: { id: 's1', entity_type: 'customer', name: 'Acme', status: 'active' },
              },
            ],
            totalElements: 1,
          });
        }
        if (ctx.config.url.endsWith('/events')) {
          return makeRes({
            ...EMPTY_PAGE,
            content: [
              {
                id: 'evt-1',
                entity_id: '1',
                entity_type: 'site',
                actor_id: null,
                event_type: 'inspection_completed',
                payload: { note: 'ok' },
                occurred_at: '2026-02-01T10:00:00Z',
              },
            ],
          });
        }
        return makeRes({ id: '1', entity_type: 'site', name: 'HQ' });
      });

      const r = new CrudResource('site', t);
      const result = await r.related('1');

      expect(urls).toEqual([
        '/api/entities/1',
        '/api/entities/1/relationships',
        '/api/entities/1/events',
      ]);
      expect(result.record).toEqual({ id: '1', entity_type: 'site', name: 'HQ' });
      expect(result.relations).toHaveLength(1);
      expect(result.relations[0]).toMatchObject({
        rel: 'belongs_to',
        direction: 'outbound',
        type: 'customer',
      });
      expect(result.relations[0].records[0]).toMatchObject({ id: 's1', name: 'Acme' });
      expect(result.events[0]).toMatchObject({
        id: 'evt-1',
        event_type: 'inspection_completed',
        timestamp: '2026-02-01T10:00:00Z',
      });
    });
  });

  describe('relationships', () => {
    it('omits paging params by default', async () => {
      let capturedParams: Record<string, unknown> | undefined;
      const t = capturingTransport(EMPTY_PAGE, (ctx) => {
        capturedParams = ctx.config.params;
      });

      const r = new CrudResource('customer', t);
      await r.relationships('1');

      expect(capturedParams).toEqual({});
    });

    it('forwards relationship_type, page and size when provided', async () => {
      let capturedParams: Record<string, unknown> | undefined;
      const t = capturingTransport(EMPTY_PAGE, (ctx) => {
        capturedParams = ctx.config.params;
      });

      const r = new CrudResource('customer', t);
      await r.relationships('1', 'belongs_to', { page: 1, size: 100 });

      expect(capturedParams).toEqual({
        relationship_type: 'belongs_to',
        page: 1,
        size: 100,
      });
    });
  });

  describe('events', () => {
    it('omits paging params by default', async () => {
      let capturedParams: Record<string, unknown> | undefined;
      const t = capturingTransport(EMPTY_PAGE, (ctx) => {
        capturedParams = ctx.config.params;
      });

      const r = new CrudResource('customer', t);
      await r.events('1');

      expect(capturedParams).toBeUndefined();
    });

    it('forwards page and size when provided', async () => {
      let capturedParams: Record<string, unknown> | undefined;
      const t = capturingTransport(EMPTY_PAGE, (ctx) => {
        capturedParams = ctx.config.params;
      });

      const r = new CrudResource('customer', t);
      await r.events('1', { page: 0, size: 100 });

      expect(capturedParams).toEqual({ page: 0, size: 100 });
    });
  });

  describe('related paging', () => {
    it('requests a full first page (size = MAX_PAGE_SIZE) for both sub-resources', async () => {
      const calls: { url: string; params?: Record<string, unknown> }[] = [];
      const t: Transport = vi.fn<Transport>().mockImplementation(async (ctx) => {
        calls.push({ url: ctx.config.url, params: ctx.config.params });
        if (ctx.config.url.endsWith('/relationships') || ctx.config.url.endsWith('/events')) {
          return makeRes(EMPTY_PAGE);
        }
        return makeRes({ id: '1', entity_type: 'site', name: 'HQ' });
      });

      const r = new CrudResource('site', t);
      await r.related('1');

      const relationships = calls.find((call) => call.url.endsWith('/relationships'));
      const events = calls.find((call) => call.url.endsWith('/events'));
      expect(relationships?.params).toEqual({ size: 100 });
      expect(events?.params).toEqual({ size: 100 });
    });
  });

  describe('checkUnique', () => {
    it('calls GET /api/entities/check-unique with entity_type/key/value', async () => {
      let capturedUrl: string | undefined;
      let capturedParams: Record<string, unknown> | undefined;
      const t = capturingTransport({ unique: true }, (ctx) => {
        capturedUrl = ctx.config.url;
        capturedParams = ctx.config.params;
      });

      const r = new CrudResource('customer', t);
      const result = await r.checkUnique('billing_email', 'alice@example.com');

      expect(capturedUrl).toBe('/api/entities/check-unique');
      expect(capturedParams).toEqual({
        entity_type: 'customer',
        key: 'billing_email',
        value: 'alice@example.com',
      });
      expect(result).toBe(true);
    });

    it('includes excludeId when provided', async () => {
      let capturedParams: Record<string, unknown> | undefined;
      const t = capturingTransport({ unique: false }, (ctx) => {
        capturedParams = ctx.config.params;
      });

      const r = new CrudResource('customer', t);
      const result = await r.checkUnique('billing_email', 'alice@example.com', '1');

      expect(capturedParams).toMatchObject({ excludeId: '1' });
      expect(result).toBe(false);
    });
  });
});

describe('normalizePage', () => {
  it('flattens the VIA_DTO PagedModel envelope', () => {
    const flat = normalizePage({
      content: [{ id: 'a' }],
      page: { size: 10, number: 1, totalElements: 12, totalPages: 2 },
    });

    expect(flat).toMatchObject({
      content: [{ id: 'a' }],
      number: 1,
      size: 10,
      totalElements: 12,
      totalPages: 2,
      numberOfElements: 1,
      empty: false,
      first: false,
      last: true,
    });
  });

  it('passes an already-flat envelope through unchanged', () => {
    expect(normalizePage(EMPTY_PAGE)).toBe(EMPTY_PAGE);
  });

  it('normalizes the envelope returned by list()', async () => {
    const t = capturingTransport({
      content: [{ id: '1', name: 'Alice' }],
      page: { size: 10, number: 0, totalElements: 1, totalPages: 1 },
    });
    const page = await new CrudResource('customer', t).list();

    expect(page.content).toHaveLength(1);
    expect(page.number).toBe(0);
    expect(page.totalElements).toBe(1);
  });
});
