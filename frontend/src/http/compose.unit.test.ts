/**
 * MonoBlocks — http/compose.unit.test.ts
 *
 * Unit tests for the Koa-style middleware compose function.
 */

import { describe, expect, it, vi } from 'vitest';

import { compose } from './compose.ts';
import type { Middleware, RequestContext, ResponseContext, Transport } from './types.ts';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx(overrides?: Partial<RequestContext>): RequestContext {
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

function makeNext(response: ResponseContext) {
  return vi.fn<() => Promise<ResponseContext>>().mockResolvedValue(response);
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('compose', () => {
  it('calls the transport when no middlewares are provided', async () => {
    const ctx = makeCtx();
    const res = makeRes({ data: 'ok' });
    const transport = vi.fn<Transport>().mockResolvedValue(res);

    const pipeline = compose([], transport);
    const result = await pipeline(ctx);

    expect(transport).toHaveBeenCalledWith(ctx);
    expect(result.data).toBe('ok');
  });

  it('calls middlewares in order', async () => {
    const order: number[] = [];
    const res = makeRes();

    const mw1: Middleware = async (_ctx, next) => {
      order.push(1);
      return next();
    };
    const mw2: Middleware = async (_ctx, next) => {
      order.push(2);
      return next();
    };
    const transport = vi.fn<Transport>().mockResolvedValue(res);

    const pipeline = compose([mw1, mw2], transport);
    await pipeline(makeCtx());

    expect(order).toEqual([1, 2]);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('allows middleware to modify ctx before calling next', async () => {
    const res = makeRes();
    let capturedHeaders: Record<string, string> | undefined;

    const mw: Middleware = async (ctx, next) => {
      ctx.config.headers = { 'X-Custom': 'value' };
      return next();
    };
    const transport = vi.fn<Transport>().mockImplementation(async (ctx) => {
      capturedHeaders = ctx.config.headers;
      return res;
    });

    const pipeline = compose([mw], transport);
    await pipeline(makeCtx());

    expect(capturedHeaders).toEqual({ 'X-Custom': 'value' });
  });

  it('allows middleware to modify the response from next', async () => {
    const res = makeRes({ data: 'original' });

    const mw: Middleware = async (_ctx, next) => {
      const response = await next();
      response.data = 'modified';
      return response;
    };
    const transport = vi.fn<Transport>().mockResolvedValue(res);

    const pipeline = compose([mw], transport);
    const result = await pipeline(makeCtx());

    expect(result.data).toBe('modified');
  });

  it('allows middleware to short-circuit without calling next', async () => {
    const shortRes = makeRes({ data: 'short-circuit' });
    const transport = vi.fn<Transport>().mockResolvedValue(makeRes({ data: 'never' }));

    const mw: Middleware = async () => shortRes;

    const pipeline = compose([mw], transport);
    const result = await pipeline(makeCtx());

    expect(result.data).toBe('short-circuit');
    expect(transport).not.toHaveBeenCalled();
  });

  it('throws when next() is called multiple times', async () => {
    const res = makeRes();

    const mw: Middleware = async (_ctx, next) => {
      await next();
      await next(); // second call — should throw
      return res;
    };
    const transport = vi.fn<Transport>().mockResolvedValue(res);

    const pipeline = compose([mw], transport);
    await expect(pipeline(makeCtx())).rejects.toThrow('next() called multiple times');
  });

  it('propagates errors from middlewares', async () => {
    const mw: Middleware = async () => {
      throw new Error('middleware boom');
    };
    const transport = vi.fn<Transport>().mockResolvedValue(makeRes());

    const pipeline = compose([mw], transport);
    await expect(pipeline(makeCtx())).rejects.toThrow('middleware boom');
  });

  it('propagates errors from transport', async () => {
    const mw: Middleware = async (_ctx, next) => next();
    const transport = vi.fn<Transport>().mockRejectedValue(new Error('transport boom'));

    const pipeline = compose([mw], transport);
    await expect(pipeline(makeCtx())).rejects.toThrow('transport boom');
  });

  it('each invocation gets a fresh dispatch index (context isolation)', async () => {
    const res = makeRes();
    const transport = vi.fn<Transport>().mockResolvedValue(res);

    const mw: Middleware = async (_ctx, next) => next();

    const pipeline = compose([mw], transport);

    // Two separate calls should not interfere
    await pipeline(makeCtx());
    await pipeline(makeCtx());

    expect(transport).toHaveBeenCalledTimes(2);
  });

  it('middleware receives the shared ctx object', async () => {
    const res = makeRes();
    let receivedCtx: RequestContext | undefined;

    const mw: Middleware = async (ctx, next) => {
      receivedCtx = ctx;
      return next();
    };
    const transport = vi.fn<Transport>().mockResolvedValue(res);

    const ctx = makeCtx();
    const pipeline = compose([mw], transport);
    await pipeline(ctx);

    expect(receivedCtx).toBe(ctx);
  });
});
