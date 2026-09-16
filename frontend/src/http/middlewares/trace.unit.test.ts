/**
 * MonoBlocks — http/middlewares/trace.unit.test.ts
 *
 * Unit tests for the B3 trace middleware and randomHex helper.
 */

import { describe, expect, it, vi } from 'vitest';

import { createTraceMiddleware, randomHex, type TraceProvider } from './trace.ts';

import type { RequestContext, ResponseContext } from '../types.ts';

// ── Helpers ─────────────────────────────────────────────────────────────────

function freshCtx(overrides?: Partial<RequestContext>): RequestContext {
  return {
    config: { url: '/test', method: 'GET', headers: {} },
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

// ── randomHex ───────────────────────────────────────────────────────────────

describe('randomHex', () => {
  it('returns a string of the requested length', () => {
    expect(randomHex(16)).toHaveLength(16);
    expect(randomHex(32)).toHaveLength(32);
    expect(randomHex(1)).toHaveLength(1);
  });

  it('returns only hex characters', () => {
    const hex = randomHex(64);
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns different values on successive calls (probabilistic)', () => {
    const a = randomHex(32);
    const b = randomHex(32);
    // Extremely unlikely to be equal
    expect(a).not.toBe(b);
  });
});

// ── createTraceMiddleware ───────────────────────────────────────────────────

describe('createTraceMiddleware', () => {
  it('injects X-B3-TraceId and X-B3-SpanId headers', async () => {
    const middleware = createTraceMiddleware();
    const ctx = freshCtx();
    const response = makeRes();
    const next = vi.fn().mockResolvedValue(response);

    await middleware(ctx, next);

    const headers = ctx.config.headers ?? {};
    expect(headers['X-B3-TraceId']).toBeDefined();
    expect(headers['X-B3-SpanId']).toBeDefined();
    expect(headers['X-B3-TraceId']).toHaveLength(32);
    expect(headers['X-B3-SpanId']).toHaveLength(16);
  });

  it('uses provider trace ID when available', async () => {
    const provider: TraceProvider = vi.fn().mockResolvedValue('aaaabbbbccccdddd');
    const middleware = createTraceMiddleware(provider);
    const ctx = freshCtx();
    const response = makeRes();
    const next = vi.fn().mockResolvedValue(response);

    await middleware(ctx, next);

    expect(ctx.config.headers?.['X-B3-TraceId']).toBe('aaaabbbbccccdddd');
  });

  it('generates a trace ID when provider returns null', async () => {
    const provider: TraceProvider = vi.fn().mockResolvedValue(null);
    const middleware = createTraceMiddleware(provider);
    const ctx = freshCtx();
    const response = makeRes();
    const next = vi.fn().mockResolvedValue(response);

    await middleware(ctx, next);

    expect(ctx.config.headers?.['X-B3-TraceId']).toBeDefined();
    expect(ctx.config.headers?.['X-B3-TraceId']).not.toBe('aaaabbbbccccdddd');
    expect(ctx.config.headers?.['X-B3-TraceId']).toHaveLength(32);
  });

  it('generates a trace ID when no provider is given', async () => {
    const middleware = createTraceMiddleware();
    const ctx = freshCtx();
    const response = makeRes();
    const next = vi.fn().mockResolvedValue(response);

    await middleware(ctx, next);

    expect(ctx.config.headers?.['X-B3-TraceId']).toHaveLength(32);
  });

  it('writes traceId and spanId to res.meta', async () => {
    const provider: TraceProvider = vi.fn().mockResolvedValue('trace-123');
    const middleware = createTraceMiddleware(provider);
    const ctx = freshCtx();
    const response = makeRes();
    const next = vi.fn().mockResolvedValue(response);

    const result = await middleware(ctx, next);

    expect(result.meta.traceId).toBe('trace-123');
    expect(result.meta.spanId).toBeDefined();
    expect(result.meta.spanId).toHaveLength(16);
  });

  it('preserves existing headers', async () => {
    const middleware = createTraceMiddleware();
    const ctx = freshCtx({
      config: { url: '/test', method: 'GET', headers: { Authorization: 'Bearer x' } },
    });
    const response = makeRes();
    const next = vi.fn().mockResolvedValue(response);

    await middleware(ctx, next);

    expect(ctx.config.headers?.Authorization).toBe('Bearer x');
    expect(ctx.config.headers?.['X-B3-TraceId']).toBeDefined();
  });

  it('calls the trace provider once per invocation', async () => {
    const provider: TraceProvider = vi.fn().mockResolvedValue('tid');
    const middleware = createTraceMiddleware(provider);
    const response = makeRes();
    const next = vi.fn().mockResolvedValue(response);

    await middleware(freshCtx(), next);
    await middleware(freshCtx(), next);

    expect(provider).toHaveBeenCalledTimes(2);
  });
});
