/**
 * MonoBlocks — http/api-client.unit.test.ts
 *
 * Unit tests for the API client factory and default client.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { RequestContext, ResponseContext } from './types.ts';

import { createApiClient, setDefaultTokenProvider } from './api-client.ts';

// ── Mock the axios transport so we don't need a real HTTP server ─────────────

vi.mock('./transport.ts', () => ({
  transport: vi.fn().mockResolvedValue({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    meta: {},
    config: { url: '/test', method: 'GET' },
  }),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx(overrides?: Partial<RequestContext>): RequestContext {
  return {
    config: { url: '/test', method: 'GET' },
    meta: {},
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('createApiClient', () => {
  it('returns a Transport function', () => {
    const client = createApiClient({
      baseURL: 'http://localhost:8080',
      tokenProvider: async () => null,
    });
    expect(typeof client).toBe('function');
  });

  it('injects baseURL into request config', async () => {
    let capturedBaseURL: string | undefined;

    const client = createApiClient({
      baseURL: 'http://localhost:3000',
      tokenProvider: async () => null,
    });

    // Intercept the transport call to capture baseURL
    const { transport } = await import('./transport.ts');
    const mockedTransport = vi.mocked(transport);
    mockedTransport.mockImplementationOnce(async (ctx) => ({
      data: ctx.config.baseURL,
      status: 200,
      statusText: 'OK',
      headers: {},
      meta: {},
      config: ctx.config,
    }));

    const result = await client(makeCtx());
    expect(result.data).toBe('http://localhost:3000');
  });

  it('composes auth middleware that injects Bearer token', async () => {
    let capturedHeaders: Record<string, string> | undefined;

    const { transport } = await import('./transport.ts');
    const mockedTransport = vi.mocked(transport);
    mockedTransport.mockImplementationOnce(async (ctx) => {
      capturedHeaders = ctx.config.headers;
      return {
        data: 'ok',
        status: 200,
        statusText: 'OK',
        headers: {},
        meta: {},
        config: ctx.config,
      };
    });

    const client = createApiClient({
      baseURL: 'http://localhost:8080',
      tokenProvider: async () => 'test-token',
    });

    await client(makeCtx());

    expect(capturedHeaders?.Authorization).toBe('Bearer test-token');
  });

  it('omits Authorization header when token provider returns null', async () => {
    let capturedHeaders: Record<string, string> | undefined;

    const { transport } = await import('./transport.ts');
    const mockedTransport = vi.mocked(transport);
    mockedTransport.mockImplementationOnce(async (ctx) => {
      capturedHeaders = ctx.config.headers;
      return {
        data: 'ok',
        status: 200,
        statusText: 'OK',
        headers: {},
        meta: {},
        config: ctx.config,
      };
    });

    const client = createApiClient({
      baseURL: 'http://localhost:8080',
      tokenProvider: async () => null,
    });

    await client(makeCtx());

    expect(capturedHeaders?.Authorization).toBeUndefined();
  });

  it('includes trace middleware when traceProvider is provided', async () => {
    let capturedHeaders: Record<string, string> | undefined;

    const { transport } = await import('./transport.ts');
    const mockedTransport = vi.mocked(transport);
    mockedTransport.mockImplementationOnce(async (ctx) => {
      capturedHeaders = ctx.config.headers;
      return {
        data: 'ok',
        status: 200,
        statusText: 'OK',
        headers: {},
        meta: {},
        config: ctx.config,
      };
    });

    const client = createApiClient({
      baseURL: 'http://localhost:8080',
      tokenProvider: async () => null,
      traceProvider: async () => 'my-trace',
    });

    await client(makeCtx());

    expect(capturedHeaders?.['X-B3-TraceId']).toBe('my-trace');
    expect(capturedHeaders?.['X-B3-SpanId']).toBeDefined();
  });

  it('includes headers middleware when extractHeaders is provided', async () => {
    const { transport } = await import('./transport.ts');
    const mockedTransport = vi.mocked(transport);
    mockedTransport.mockImplementationOnce(async (ctx) => ({
      data: 'ok',
      status: 200,
      statusText: 'OK',
      headers: { 'x-total-count': '5' },
      meta: {},
      config: ctx.config,
    }));

    const client = createApiClient({
      baseURL: 'http://localhost:8080',
      tokenProvider: async () => null,
      extractHeaders: ['X-Total-Count'],
    });

    const result = await client(makeCtx());

    expect(result.meta.headers).toEqual({ 'x-total-count': '5' });
  });

  it('custom middlewares run before auth', async () => {
    const order: string[] = [];

    const { transport } = await import('./transport.ts');
    const mockedTransport = vi.mocked(transport);
    mockedTransport.mockImplementationOnce(async () => {
      order.push('transport');
      return {
        data: 'ok',
        status: 200,
        statusText: 'OK',
        headers: {},
        meta: {},
        config: { url: '/test', method: 'GET' },
      };
    });

    const custom = async (_ctx: RequestContext, next: () => Promise<ResponseContext>) => {
      order.push('custom');
      return next();
    };

    const client = createApiClient({
      baseURL: 'http://localhost:8080',
      tokenProvider: async () => {
        order.push('auth');
        return 'tok';
      },
      middlewares: [custom],
    });

    await client(makeCtx());

    expect(order).toEqual(['custom', 'auth', 'transport']);
  });

  it('sets retryCount meta from retry middleware', async () => {
    const { transport } = await import('./transport.ts');
    const mockedTransport = vi.mocked(transport);
    mockedTransport.mockImplementationOnce(async (ctx) => ({
      data: 'ok',
      status: 200,
      statusText: 'OK',
      headers: {},
      meta: {},
      config: ctx.config,
    }));

    const client = createApiClient({
      baseURL: 'http://localhost:8080',
      tokenProvider: async () => null,
    });

    const result = await client(makeCtx());

    expect(result.meta.retryCount).toBe(0);
  });
});

describe('setDefaultTokenProvider', () => {
  beforeEach(() => {
    setDefaultTokenProvider(async () => null);
  });

  it('updates the default token provider without error', () => {
    const newProvider = async () => 'new-token';
    setDefaultTokenProvider(newProvider);
    // The `request` transport uses the provider lazily.
    // Just verify the function doesn't throw.
    expect(true).toBe(true);
  });
});
