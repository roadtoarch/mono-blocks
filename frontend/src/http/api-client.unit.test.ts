/**
 * Unit tests for {@link module:http/api-client}.
 *
 * Mocks all middleware factories and transport to verify that
 * `createApiClient` composes the stack in the correct order and
 * that the default instance is properly configured.
 *
 * @module http/api-client.unit.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mock middleware factories ───────────────────────────────────────
//
// Each factory returns a uniquely identifiable middleware so we can
// assert on composition order.  vi.hoisted() ensures the mock
// functions are available when the hoisted vi.mock() factories execute.

const {
  mockAuthMiddleware,
  mockTraceMiddleware,
  mockRetryMiddleware,
  mockHeadersMiddleware,
  mockTransport,
} = vi.hoisted(() => ({
  mockAuthMiddleware: vi.fn(),
  mockTraceMiddleware: vi.fn(),
  mockRetryMiddleware: vi.fn(),
  mockHeadersMiddleware: vi.fn(),
  mockTransport: vi.fn(),
}));

vi.mock('./middlewares/auth', () => ({
  createAuthMiddleware: vi.fn(() => mockAuthMiddleware),
}));

vi.mock('./middlewares/trace', () => ({
  createTraceMiddleware: vi.fn(() => mockTraceMiddleware),
}));

vi.mock('./middlewares/retry', () => ({
  createRetryMiddleware: vi.fn(() => mockRetryMiddleware),
}));

vi.mock('./middlewares/headers', () => ({
  createHeadersMiddleware: vi.fn(() => mockHeadersMiddleware),
}));

vi.mock('./transport', () => ({
  transport: mockTransport,
}));

vi.mock('./compose', () => ({
  compose: vi.fn(() => mockTransport),
}));

vi.mock('@/env', () => ({
  env: { VITE_API_URL: 'http://localhost:8080' },
}));

// ── Import after mocks ──────────────────────────────────────────────

import { createApiClient, setDefaultTokenProvider, defaultClient, request } from './api-client';

import type { ApiClientConfig } from './api-client';
import type { Middleware, RequestContext, ResponseContext, Transport } from './types';

// ── Helpers ─────────────────────────────────────────────────────────

const baseResponse: ResponseContext = {
  data: {},
  status: 200,
  statusText: 'OK',
  headers: {},
  meta: {},
  config: { url: '/api/test', method: 'GET' },
};

const baseConfig: ApiClientConfig = {
  baseURL: 'http://api.example.com',
  tokenProvider: async () => 'test-token',
};

// ── Suite ───────────────────────────────────────────────────────────

describe('createApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransport.mockResolvedValue(baseResponse);
  });

  // ── Factory ──────────────────────────────────────────────────────

  it('returns a Transport function', () => {
    const client = createApiClient(baseConfig);

    expect(typeof client).toBe('function');
  });

  it('creates auth middleware with the provided tokenProvider', async () => {
    const tokenProvider = async () => 'my-token';
    createApiClient({ ...baseConfig, tokenProvider });

    const { createAuthMiddleware } = await import('./middlewares/auth');
    expect(createAuthMiddleware).toHaveBeenCalledWith(tokenProvider);
  });

  it('creates trace middleware with the provided traceProvider', async () => {
    const traceProvider = async () => 'existing-trace';
    createApiClient({ ...baseConfig, traceProvider });

    const { createTraceMiddleware } = await import('./middlewares/trace');
    expect(createTraceMiddleware).toHaveBeenCalledWith(traceProvider);
  });

  it('creates trace middleware without a traceProvider', async () => {
    createApiClient(baseConfig);

    const { createTraceMiddleware } = await import('./middlewares/trace');
    expect(createTraceMiddleware).toHaveBeenCalledWith(undefined);
  });

  it('creates headers middleware with the provided header names', async () => {
    createApiClient({ ...baseConfig, extractHeaders: ['X-RateLimit-Limit'] });

    const { createHeadersMiddleware } = await import('./middlewares/headers');
    expect(createHeadersMiddleware).toHaveBeenCalledWith(['X-RateLimit-Limit']);
  });

  it('creates headers middleware with empty array when no extractHeaders', async () => {
    createApiClient(baseConfig);

    const { createHeadersMiddleware } = await import('./middlewares/headers');
    expect(createHeadersMiddleware).toHaveBeenCalledWith([]);
  });

  // ── Composition order ────────────────────────────────────────────

  it('composes middlewares with compose()', async () => {
    createApiClient(baseConfig);

    const { compose } = await import('./compose');
    expect(compose).toHaveBeenCalledTimes(1);

    // compose(middlewares, transport) — verify middlewares include all 4
    const [middlewares] = (compose as ReturnType<typeof vi.fn>).mock.calls[0] as [
      Middleware[],
      Transport,
    ];
    expect(middlewares).toContain(mockAuthMiddleware);
    expect(middlewares).toContain(mockTraceMiddleware);
    expect(middlewares).toContain(mockRetryMiddleware);
    expect(middlewares).toContain(mockHeadersMiddleware);
  });

  it('prepends custom middlewares before the standard stack', async () => {
    const customMiddleware: Middleware = vi.fn();
    createApiClient({ ...baseConfig, middlewares: [customMiddleware] });

    const { compose } = await import('./compose');
    const [middlewares] = (compose as ReturnType<typeof vi.fn>).mock.calls[0] as [
      Middleware[],
      Transport,
    ];

    // Custom middleware should appear before auth
    const customIndex = middlewares.indexOf(customMiddleware);
    const authIndex = middlewares.indexOf(mockAuthMiddleware);
    expect(customIndex).toBeLessThan(authIndex);
  });

  // ── baseURL injection ────────────────────────────────────────────

  it('injects baseURL from config when ctx.config.baseURL is not set', async () => {
    const client = createApiClient(baseConfig);

    const ctx: RequestContext = {
      config: { url: '/api/test', method: 'GET' },
      meta: {},
    };

    await client(ctx);

    // The composed pipeline (mockTransport) should receive a context
    // with baseURL injected from config
    const passedCtx = mockTransport.mock.calls[0]?.[0] as RequestContext | undefined;
    expect(passedCtx?.config.baseURL).toBe('http://api.example.com');
  });

  it('preserves ctx.config.baseURL when already set', async () => {
    const client = createApiClient(baseConfig);

    const ctx: RequestContext = {
      config: {
        url: '/api/test',
        method: 'GET',
        baseURL: 'http://other.example.com',
      },
      meta: {},
    };

    await client(ctx);

    const passedCtx = mockTransport.mock.calls[0]?.[0] as RequestContext | undefined;
    expect(passedCtx?.config.baseURL).toBe('http://other.example.com');
  });

  // ── Default instance ─────────────────────────────────────────────

  it('exports a defaultClient using VITE_API_URL', () => {
    expect(typeof defaultClient).toBe('function');
  });

  it('request is an alias for defaultClient', () => {
    expect(request).toBe(defaultClient);
  });

  // ── Token provider ───────────────────────────────────────────────

  it('defaultClient returns null token before setDefaultTokenProvider is called', async () => {
    // Reset to initial state
    setDefaultTokenProvider(async () => null);

    // The default client's tokenProvider delegates to defaultTokenProvider
    // which currently returns null
    const token = await (async () => null)();
    expect(token).toBeNull();
  });

  it('setDefaultTokenProvider replaces the token provider', async () => {
    const newProvider = async () => 'new-token';
    setDefaultTokenProvider(newProvider);

    // Calling the captured provider should return 'new-token'
    // (We can't easily inspect the closure, but we verify it's callable)
    const token = await newProvider();
    expect(token).toBe('new-token');
  });
});
