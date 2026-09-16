/**
 * MonoBlocks — http/middlewares/auth.unit.test.ts
 *
 * Unit tests for the auth middleware.
 */

import { describe, expect, it, vi } from 'vitest';

import { createAuthMiddleware, type TokenProvider } from './auth.ts';

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

// ── Tests ───────────────────────────────────────────────────────────────────

describe('createAuthMiddleware', () => {
  it('injects Authorization header when token is available', async () => {
    const provider: TokenProvider = vi.fn().mockResolvedValue('my-token');
    const middleware = createAuthMiddleware(provider);
    const ctx = freshCtx();
    const response = makeRes();
    const next = vi.fn().mockResolvedValue(response);

    await middleware(ctx, next);

    expect(ctx.config.headers?.Authorization).toBe('Bearer my-token');
    expect(next).toHaveBeenCalledOnce();
  });

  it('does not inject header when token is null', async () => {
    const provider: TokenProvider = vi.fn().mockResolvedValue(null);
    const middleware = createAuthMiddleware(provider);
    const ctx = freshCtx();
    const response = makeRes();
    const next = vi.fn().mockResolvedValue(response);

    await middleware(ctx, next);

    expect(ctx.config.headers?.Authorization).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });

  it('preserves existing headers', async () => {
    const provider: TokenProvider = vi.fn().mockResolvedValue('tok');
    const middleware = createAuthMiddleware(provider);
    const ctx = freshCtx({
      config: { url: '/test', method: 'GET', headers: { 'X-Custom': 'val' } },
    });
    const response = makeRes();
    const next = vi.fn().mockResolvedValue(response);

    await middleware(ctx, next);

    expect(ctx.config.headers?.Authorization).toBe('Bearer tok');
    expect(ctx.config.headers?.['X-Custom']).toBe('val');
  });

  it('does not inject header when token is empty string', async () => {
    const provider: TokenProvider = vi.fn().mockResolvedValue('');
    const middleware = createAuthMiddleware(provider);
    const ctx = freshCtx();
    const response = makeRes();
    const next = vi.fn().mockResolvedValue(response);

    await middleware(ctx, next);

    expect(ctx.config.headers?.Authorization).toBeUndefined();
  });

  it('calls the token provider on every invocation', async () => {
    const provider: TokenProvider = vi.fn().mockResolvedValue('tok');
    const middleware = createAuthMiddleware(provider);
    const response = makeRes();
    const next = vi.fn().mockResolvedValue(response);

    await middleware(freshCtx(), next);
    await middleware(freshCtx(), next);

    expect(provider).toHaveBeenCalledTimes(2);
  });

  it('returns the response from next', async () => {
    const provider: TokenProvider = vi.fn().mockResolvedValue('tok');
    const middleware = createAuthMiddleware(provider);
    const ctx = freshCtx();
    const response = makeRes({ data: 'result' });
    const next = vi.fn().mockResolvedValue(response);

    const result = await middleware(ctx, next);

    expect(result).toBe(response);
  });
});
