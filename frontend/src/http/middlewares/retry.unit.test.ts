/**
 * MonoBlocks — http/middlewares/retry.unit.test.ts
 *
 * Unit tests for the retry middleware.
 */

import { describe, expect, it, vi } from 'vitest';

import type { RequestContext, ResponseContext } from '../types.ts';
import { HttpError, NetworkError } from '../types.ts';

import { createRetryMiddleware } from './retry.ts';

// ── Helpers ─────────────────────────────────────────────────────────────────

function freshCtx(overrides?: Partial<RequestContext>): RequestContext {
  return {
    config: { url: '/test', method: 'GET' },
    meta: {},
    ...overrides,
  };
}

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

// ── Tests ───────────────────────────────────────────────────────────────────

describe('createRetryMiddleware', () => {
  it('returns response on first success', async () => {
    const middleware = createRetryMiddleware();
    const ctx = freshCtx();
    const response = makeRes({ data: 'ok' });
    const next = vi.fn().mockResolvedValue(response);

    const result = await middleware(ctx, next);

    expect(result.data).toBe('ok');
    expect(next).toHaveBeenCalledOnce();
    expect(result.meta.retryCount).toBe(0);
  });

  it('retries on 5xx HttpError', async () => {
    const middleware = createRetryMiddleware();
    const ctx = freshCtx({ meta: { maxRetries: 2, retryDelayMs: 0 } });
    const response = makeRes({ data: 'ok' });
    const next = vi
      .fn()
      .mockRejectedValueOnce(new HttpError(500, 'Internal Server Error', '/test'))
      .mockResolvedValueOnce(response);

    const result = await middleware(ctx, next);

    expect(result.data).toBe('ok');
    expect(next).toHaveBeenCalledTimes(2);
    expect(result.meta.retryCount).toBe(1);
  });

  it('retries on NetworkError', async () => {
    const middleware = createRetryMiddleware();
    const ctx = freshCtx({ meta: { maxRetries: 2, retryDelayMs: 0 } });
    const response = makeRes({ data: 'ok' });
    const next = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError('ECONNREFUSED'))
      .mockResolvedValueOnce(response);

    const result = await middleware(ctx, next);

    expect(result.data).toBe('ok');
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on 4xx HttpError', async () => {
    const middleware = createRetryMiddleware();
    const ctx = freshCtx({ meta: { maxRetries: 3, retryDelayMs: 0 } });
    const next = vi.fn().mockRejectedValue(new HttpError(400, 'Bad Request', '/test'));

    await expect(middleware(ctx, next)).rejects.toThrow('HTTP 400');
    expect(next).toHaveBeenCalledOnce();
  });

  it('does NOT retry on non-ApiError', async () => {
    const middleware = createRetryMiddleware();
    const ctx = freshCtx({ meta: { maxRetries: 3, retryDelayMs: 0 } });
    const next = vi.fn().mockRejectedValue(new Error('random error'));

    await expect(middleware(ctx, next)).rejects.toThrow('random error');
    expect(next).toHaveBeenCalledOnce();
  });

  it('exhausts maxRetries and throws the last error', async () => {
    const middleware = createRetryMiddleware();
    const ctx = freshCtx({ meta: { maxRetries: 1, retryDelayMs: 0 } });
    const error = new HttpError(503, 'Service Unavailable', '/test');
    const next = vi.fn().mockRejectedValue(error);

    await expect(middleware(ctx, next)).rejects.toThrow('HTTP 503');
    // initial attempt + 1 retry
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('uses default maxRetries (3) and retryDelayMs (1000) when meta is empty', async () => {
    const middleware = createRetryMiddleware();
    const ctx = freshCtx({ meta: { retryDelayMs: 0 } }); // 0 delay to speed test
    const error = new HttpError(500, 'Internal Server Error', '/test');
    const response = makeRes({ data: 'ok' });
    // Fail 3 times then succeed
    const next = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(response);

    const result = await middleware(ctx, next);

    expect(result.data).toBe('ok');
    // initial + 3 retries = 4 calls
    expect(next).toHaveBeenCalledTimes(4);
    expect(result.meta.retryCount).toBe(3);
  });

  it('sets retryCount to 0 on first-attempt success', async () => {
    const middleware = createRetryMiddleware();
    const ctx = freshCtx();
    const response = makeRes();
    const next = vi.fn().mockResolvedValue(response);

    const result = await middleware(ctx, next);

    expect(result.meta.retryCount).toBe(0);
  });
});
