/**
 * MonoBlocks — Mock transport
 *
 * Adapts `mockDb` to the `Transport` interface so the Resource pattern
 * works identically whether the backend is the mock database or a real API.
 *
 * This is the **development** transport. In production, use the axios
 * transport via `createApiClient()`.
 *
 * URL routing convention:
 *   GET    /api/{collection}              → list(type, opts)
 *   GET    /api/{collection}/{id}         → getRecord(type, id)
 *   GET    /api/{collection}/{id}/related → related(type, id)
 *   GET    /api/{collection}/check-unique → checkUnique(type, key, value, exclId)
 *   POST   /api/{collection}             → create(type, data)
 *   PATCH  /api/{collection}/{id}        → update(type, id, data)
 *   DELETE /api/{collection}/{id}        → remove(type, id)
 *   POST   /api/reset                    → reset()
 */

import * as mockDb from './mockDb';

import type { RequestContext, ResponseContext, Transport } from '@/http/types';
import type { EntityType } from '@/schema/types';

// ─── Route helpers ───────────────────────────────────────────────────────────

/**
 * Map a URL path segment to an EntityType.
 * e.g. "customers" → "customer", "work-orders" → "work_order"
 */
const SEGMENT_TO_TYPE: Record<string, EntityType> = {
  'customers': 'customer',
  'sites': 'site',
  'equipment': 'equipment',
  'technicians': 'technician',
  'work-orders': 'work_order',
};

interface ParsedRoute {
  type: EntityType;
  id: string | null;
  action: string | null;
}

/**
 * Parse a URL like `/api/customers/cust-001/related` into { type, id, action }.
 */
function parseUrl(url: string): ParsedRoute {
  // Strip baseURL prefix if present
  const path = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/api\//, '');
  const segments = path.split('/').filter(Boolean);

  const collection = segments[0] ?? '';
  const type = SEGMENT_TO_TYPE[collection];

  if (!type) {
    throw new Error(`MockTransport: unknown collection "${collection}"`);
  }

  const id = segments[1] ?? null;
  const action = segments[2] ?? null;

  return { type, id, action };
}

// ─── Mock transport ──────────────────────────────────────────────────────────

/**
 * Transport that delegates to mockDb.
 * Use during development; swap to the real axios transport for production.
 */
export const mockTransport: Transport = async (ctx: RequestContext): Promise<ResponseContext> => {
  const { config } = ctx;
  let data: unknown;

  // Special-case: POST /api/reset (no collection segment)
  if (config.method === 'POST' && config.url.endsWith('/reset')) {
    data = await mockDb.reset();
    return {
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      meta: { ...ctx.meta },
      config,
    };
  }

  const route = parseUrl(config.url);

  switch (config.method) {
    case 'GET': {
      if (route.action === 'related' && route.id) {
        data = await mockDb.related(route.type, route.id);
      } else if (route.action === 'check-unique' || route.id === 'check-unique') {
        const params = (config.params ?? {}) as Record<string, string>;
        data = await mockDb.checkUnique(
          route.type,
          params.key ?? '',
          params.value ?? '',
          params.excludeId,
        );
      } else if (route.id) {
        data = await mockDb.getRecord(route.type, route.id);
      } else {
        // List with query params → ListOptions
        const params = config.params ?? {};
        const sortKey = params.sortKey as string | undefined;
        const sortDir = params.sortDir as 'asc' | 'desc' | undefined;

        // Collect filter.* params into a filters record
        const filters: Record<string, string> = {};
        for (const [key, value] of Object.entries(params)) {
          if (key.startsWith('filter.')) {
            const filterKey = key.slice('filter.'.length);
            filters[filterKey] = String(value);
          }
        }

        data = await mockDb.list(route.type, {
          q: params.q as string | undefined,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
          sort: sortKey ? { key: sortKey, dir: sortDir ?? 'asc' } : undefined,
        });
      }
      break;
    }

    case 'POST': {
      data = await mockDb.create(route.type, (config.data ?? {}) as Record<string, unknown>);
      break;
    }

    case 'PATCH': {
      if (!route.id) throw new Error(`MockTransport: PATCH requires an ID in URL "${config.url}"`);
      data = await mockDb.update(
        route.type,
        route.id,
        (config.data ?? {}) as Record<string, unknown>,
      );
      break;
    }

    case 'DELETE': {
      if (!route.id) throw new Error(`MockTransport: DELETE requires an ID in URL "${config.url}"`);
      data = await mockDb.remove(route.type, route.id);
      break;
    }

    default:
      throw new Error(`MockTransport: unsupported method "${config.method}"`);
  }

  return {
    data,
    status: config.method === 'POST' && !route.id ? 201 : 200,
    statusText: 'OK',
    headers: {},
    meta: { ...ctx.meta },
    config,
  };
};
