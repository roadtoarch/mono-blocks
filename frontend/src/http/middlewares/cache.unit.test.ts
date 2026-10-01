/**
 * MonoBlocks — http/middlewares/cache.unit.test.ts
 *
 * Unit tests for the cache middleware (currently a no-op placeholder).
 */

import { describe, expect, it, vi } from 'vitest';

import { createCacheMiddleware } from './cache.ts';

import type { RequestContext, ResponseContext } from '../types.ts';

function makeRes(overrides?: Partial<ResponseContext>): ResponseContext {
  return {
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    meta: {},
    config: { url: '/test', method: 'GET' },
    ...overrides,
  };
}

describe('createCacheMiddleware', () => {
  it('passes through to next without modification', async () => {
    const middleware = createCacheMiddleware();
    const response = makeRes({ data: 'ok' });
    const next = vi.fn().mockResolvedValue(response);
    const ctx: RequestContext = { config: { url: '/test', method: 'GET' }, meta: {} };

    const result = await middleware(ctx, next);

    expect(result).toBe(response);
    expect(next).toHaveBeenCalledOnce();
  });
});
