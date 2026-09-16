/**
 * MonoBlocks — http/middlewares/headers.unit.test.ts
 *
 * Unit tests for the headers extraction middleware.
 */

import { describe, expect, it, vi } from 'vitest';

import type { RequestContext, ResponseContext } from '../types.ts';

import { createHeadersMiddleware } from './headers.ts';

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

describe('createHeadersMiddleware', () => {
  it('extracts named headers into res.meta.headers', async () => {
    const middleware = createHeadersMiddleware(['X-Total-Count', 'X-Page']);
    const ctx = freshCtx();
    const response = makeRes({
      headers: { 'x-total-count': '42', 'x-page': '1', 'x-other': 'ignored' },
    });
    const next = vi.fn().mockResolvedValue(response);

    const result = await middleware(ctx, next);

    expect(result.meta.headers).toEqual({
      'x-total-count': '42',
      'x-page': '1',
    });
  });

  it('skips headers not present in the response', async () => {
    const middleware = createHeadersMiddleware(['X-Missing']);
    const ctx = freshCtx();
    const response = makeRes({ headers: { 'x-other': 'val' } });
    const next = vi.fn().mockResolvedValue(response);

    const result = await middleware(ctx, next);

    expect(result.meta.headers).toEqual({});
  });

  it('matches header names case-insensitively', async () => {
    const middleware = createHeadersMiddleware(['X-TOTAL-COUNT']);
    const ctx = freshCtx();
    const response = makeRes({ headers: { 'x-total-count': '10' } });
    const next = vi.fn().mockResolvedValue(response);

    const result = await middleware(ctx, next);

    // Stored lowercased
    expect(result.meta.headers).toEqual({ 'x-total-count': '10' });
  });

  it('works with empty header names array', async () => {
    const middleware = createHeadersMiddleware([]);
    const ctx = freshCtx();
    const response = makeRes({ headers: { 'x-foo': 'bar' } });
    const next = vi.fn().mockResolvedValue(response);

    const result = await middleware(ctx, next);

    expect(result.meta.headers).toEqual({});
  });

  it('preserves other meta properties', async () => {
    const middleware = createHeadersMiddleware(['X-Id']);
    const ctx = freshCtx();
    const response = makeRes({
      headers: { 'x-id': 'abc' },
      meta: { traceId: 'trace-123' },
    });
    const next = vi.fn().mockResolvedValue(response);

    const result = await middleware(ctx, next);

    expect(result.meta.traceId).toBe('trace-123');
    expect(result.meta.headers).toEqual({ 'x-id': 'abc' });
  });

  it('overwrites existing res.meta.headers', async () => {
    const middleware = createHeadersMiddleware(['X-New']);
    const ctx = freshCtx();
    const response = makeRes({
      headers: { 'x-new': 'fresh' },
      meta: { headers: { 'x-old': 'stale' } },
    });
    const next = vi.fn().mockResolvedValue(response);

    const result = await middleware(ctx, next);

    expect(result.meta.headers).toEqual({ 'x-new': 'fresh' });
  });
});
