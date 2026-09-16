/**
 * MonoBlocks — http/middlewares/offline.unit.test.ts
 *
 * Unit tests for the offline middleware (currently a no-op placeholder).
 */

import { describe, expect, it, vi } from 'vitest';

import { createOfflineMiddleware } from './offline.ts';

import type { ResponseContext } from '../types.ts';

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

describe('createOfflineMiddleware', () => {
  it('passes through to next without modification', async () => {
    const middleware = createOfflineMiddleware();
    const response = makeRes({ data: 'ok' });
    const next = vi.fn().mockResolvedValue(response);
    const ctx = { config: { url: '/test', method: 'GET' }, meta: {} };

    const result = await middleware(ctx, next);

    expect(result).toBe(response);
    expect(next).toHaveBeenCalledOnce();
  });
});
