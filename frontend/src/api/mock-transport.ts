/**
 * MonoBlocks — Mock transport
 *
 * Adapts `mockDb` to the `Transport` interface so the Resource pattern works
 * identically whether the backend is the mock database or the real API.
 *
 * The mock is kept for unit tests only — the running app wires the real axios
 * pipeline through `setTransport` in `main.tsx`. This module mirrors the live
 * protocol: a single `/api/entities` collection discriminated by `entity_type`,
 * Spring `Page<T>` envelopes on list, and 204/no-body deletes.
 *
 * URL routing convention:
 *   GET    /api/entities                    → list(type, opts) wrapped in a Page
 *   GET    /api/entities/types              → distinct entity types
 *   GET    /api/entities/check-unique       → checkUnique(type, key, value, exclId)
 *   GET    /api/entities/{id}               → getRecord(type, id)
 *   GET    /api/entities/{id}/relationships → empty Page (mock has no edges)
 *   GET    /api/entities/{id}/events        → empty Page
 *   POST   /api/entities                   → create(type, data)
 *   PATCH  /api/entities/{id}              → update(type, id, data)
 *   DELETE /api/entities/{id}              → remove(type, id)
 */

import * as mockDb from './mockDb';

import type { Page } from '@/api/types';
import type { RequestContext, ResponseContext, Transport } from '@/http/types';
import type { EntityType, SortDef } from '@/schema/types';

import { has, types } from '@/schema/helpers';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Split `/api/entities/{id}/{action}` into its parts. */
function parsePath(url: string): { resource: string; id: string | null; action: string | null } {
  const path = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/api\/?/, '');
  const segments = path.split('/').filter(Boolean);
  return { resource: segments[0] ?? '', id: segments[1] ?? null, action: segments[2] ?? null };
}

/** Find the entity type that owns a given id (mock ids are prefixed per type). */
function resolveTypeById(id: string): EntityType | null {
  for (const type of types()) {
    if (mockDb.peek(type).some((record) => record.id === id)) return type;
  }
  return null;
}

function requireType(value: unknown): EntityType {
  const str = typeof value === 'string' ? value : '';
  if (!has(str)) throw new Error(`MockTransport: unknown entity_type "${str}"`);
  return str;
}

function toInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseSort(value: unknown): SortDef | undefined {
  if (typeof value !== 'string' || value === '') return undefined;
  const [key, dir] = value.split(',');
  if (!key) return undefined;
  return { key, dir: dir === 'desc' ? 'desc' : 'asc' };
}

/** Build a Spring `PageImpl`-shaped envelope. */
function pageEnvelope<T>(
  content: T[],
  number: number,
  size: number,
  totalElements: number,
): Page<T> {
  const sort = { empty: true, sorted: false, unsorted: true };
  return {
    content,
    empty: content.length === 0,
    first: number <= 0,
    last: size <= 0 || (number + 1) * size >= totalElements,
    number,
    numberOfElements: content.length,
    pageable: {
      offset: number * size,
      pageNumber: number,
      pageSize: size,
      paged: true,
      unpaged: false,
      sort,
    },
    size,
    sort,
    totalElements,
    totalPages: size > 0 ? Math.ceil(totalElements / size) : 0,
  };
}

function emptyPage(size = DEFAULT_PAGE_SIZE): Page<never> {
  return pageEnvelope<never>([], 0, size, 0);
}

function respond(ctx: RequestContext, data: unknown, status = 200): ResponseContext {
  return {
    data,
    status,
    statusText: status === 201 ? 'Created' : status === 204 ? 'No Content' : 'OK',
    headers: {},
    meta: { ...ctx.meta },
    config: ctx.config,
  };
}

// ─── Mock transport ──────────────────────────────────────────────────────────

/**
 * Transport that delegates to mockDb, mirroring the live API protocol.
 * Use during unit tests; the app wires the real axios transport at startup.
 */
export const mockTransport: Transport = async (ctx: RequestContext): Promise<ResponseContext> => {
  const { config } = ctx;
  const params = config.params ?? {};
  const { resource, id, action } = parsePath(config.url);

  if (resource !== 'entities') {
    throw new Error(`MockTransport: unknown resource "${resource}"`);
  }

  switch (config.method) {
    case 'GET': {
      if (id === 'types') {
        const present = types().filter((type) => mockDb.peek(type).length > 0);
        return respond(ctx, present);
      }
      if (id === 'check-unique') {
        const type = requireType(params.entity_type);
        const unique = await mockDb.checkUnique(
          type,
          typeof params.key === 'string' ? params.key : '',
          typeof params.value === 'string' ? params.value : '',
          typeof params.excludeId === 'string' ? params.excludeId : undefined,
        );
        return respond(ctx, { unique });
      }
      if (id && action === 'relationships') {
        return respond(ctx, emptyPage());
      }
      if (id && action === 'events') {
        return respond(ctx, emptyPage());
      }
      if (id) {
        const type = resolveTypeById(id);
        if (!type) throw new Error(`MockTransport: no record "${id}"`);
        return respond(ctx, await mockDb.getRecord(type, id));
      }
      const type = requireType(params.entity_type);
      const filters: Record<string, string> = {};
      if (typeof params.status === 'string' && params.status !== '') {
        filters.status = params.status;
      }
      const all = await mockDb.list(type, {
        q: typeof params.search === 'string' ? params.search : undefined,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        sort: parseSort(params.sort),
      });
      const page = toInt(params.page, 0);
      const size = toInt(params.size, DEFAULT_PAGE_SIZE);
      const start = page * size;
      return respond(ctx, pageEnvelope(all.slice(start, start + size), page, size, all.length));
    }

    case 'POST': {
      const data = (config.data ?? {}) as Record<string, unknown>;
      const type = requireType(data.entity_type);
      return respond(ctx, await mockDb.create(type, data), 201);
    }

    case 'PATCH': {
      if (!id) throw new Error(`MockTransport: PATCH requires an ID in "${config.url}"`);
      const type = resolveTypeById(id);
      if (!type) throw new Error(`MockTransport: no record "${id}"`);
      return respond(
        ctx,
        await mockDb.update(type, id, (config.data ?? {}) as Record<string, unknown>),
      );
    }

    case 'DELETE': {
      if (!id) throw new Error(`MockTransport: DELETE requires an ID in "${config.url}"`);
      const type = resolveTypeById(id);
      if (!type) throw new Error(`MockTransport: no record "${id}"`);
      await mockDb.remove(type, id);
      return respond(ctx, undefined, 204);
    }

    default:
      throw new Error(`MockTransport: unsupported method "${config.method}"`);
  }
};
