/**
 * MonoBlocks — http/transport.unit.test.ts
 *
 * Unit tests for the axios transport and normalizeHeaders helper.
 */

import axios from 'axios';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { normalizeHeaders, transport } from './transport.ts';
import { AbortError, HttpError, NetworkError } from './types.ts';

import type { RequestContext } from './types.ts';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('axios', () => ({
  default: vi.fn(),
}));

const mockedAxios = vi.mocked(axios);

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx(overrides?: Partial<RequestContext>): RequestContext {
  return {
    config: { url: '/test', method: 'GET' },
    meta: {},
    ...overrides,
  };
}

// ── normalizeHeaders ────────────────────────────────────────────────────────

describe('normalizeHeaders', () => {
  it('returns empty object for undefined', () => {
    expect(normalizeHeaders(undefined)).toEqual({});
  });

  it('returns empty object for null', () => {
    expect(normalizeHeaders(null as unknown as undefined)).toEqual({});
  });

  it('handles a plain Record<string, string>', () => {
    const result = normalizeHeaders({ 'Content-Type': 'application/json', 'X-Custom': 'val' });
    expect(result).toEqual({ 'Content-Type': 'application/json', 'X-Custom': 'val' });
  });

  it('handles a Headers object', () => {
    const headers = new Headers();
    headers.set('content-type', 'text/html');
    headers.set('x-foo', 'bar');

    const result = normalizeHeaders(headers);
    expect(result).toEqual({ 'content-type': 'text/html', 'x-foo': 'bar' });
  });

  it('returns a shallow copy of plain objects', () => {
    const original = { 'X-Id': '1' };
    const result = normalizeHeaders(original);
    expect(result).toEqual(original);
    expect(result).not.toBe(original);
  });
});

// ── transport ───────────────────────────────────────────────────────────────

describe('transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps successful axios response to ResponseContext', async () => {
    mockedAxios.mockResolvedValueOnce({
      data: { id: 1 },
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
    });

    const ctx = makeCtx();
    const result = await transport(ctx);

    expect(result.data).toEqual({ id: 1 });
    expect(result.status).toBe(200);
    expect(result.statusText).toBe('OK');
    expect(result.config).toBe(ctx.config);
    expect(result.meta).toEqual({});
  });

  it('passes request config fields to axios', async () => {
    mockedAxios.mockResolvedValueOnce({
      data: 'ok',
      status: 200,
      statusText: 'OK',
      headers: {},
    });

    const ctx = makeCtx({
      config: {
        url: '/api/users',
        method: 'POST',
        baseURL: 'http://localhost:8080',
        headers: { Authorization: 'Bearer tok' },
        params: { page: 1 },
        data: { name: 'Alice' },
        timeout: 5000,
      },
    });

    await transport(ctx);

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/users',
        method: 'POST',
        baseURL: 'http://localhost:8080',
        headers: { Authorization: 'Bearer tok' },
        params: { page: 1 },
        data: { name: 'Alice' },
        timeout: 5000,
        validateStatus: expect.any(Function),
      }),
    );
  });

  it('maps axios ERR_CANCELED to AbortError', async () => {
    const axiosError = new Error('canceled');
    (axiosError as unknown as Record<string, unknown>).code = 'ERR_CANCELED';
    mockedAxios.mockRejectedValueOnce(axiosError);

    await expect(transport(makeCtx())).rejects.toThrow(AbortError);
  });

  it('maps axios response error to HttpError', async () => {
    const axiosError = new Error('bad');
    (axiosError as unknown as Record<string, unknown>).code = 'ERR_BAD_RESPONSE';
    (axiosError as unknown as Record<string, { url: string }>).config = { url: '/api/bad' };
    (axiosError as unknown as Record<string, unknown>).response = {
      status: 422,
      statusText: 'Unprocessable Entity',
      data: { detail: 'invalid' },
    };
    mockedAxios.mockRejectedValueOnce(axiosError);

    try {
      await transport(makeCtx());
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      const httpErr = err as HttpError;
      expect(httpErr.status).toBe(422);
      expect(httpErr.statusText).toBe('Unprocessable Entity');
      expect(httpErr.path).toBe('/api/bad');
      expect(httpErr.body).toEqual({ detail: 'invalid' });
    }
  });

  it('dispatches auth:unauthorized CustomEvent on 401', async () => {
    const dispatchSpy = vi.spyOn(globalThis, 'dispatchEvent').mockReturnValue(true);

    const axiosError = new Error('unauthorized');
    (axiosError as unknown as Record<string, unknown>).code = 'ERR_BAD_RESPONSE';
    (axiosError as unknown as Record<string, { url: string }>).config = { url: '/api/secure' };
    (axiosError as unknown as Record<string, unknown>).response = {
      status: 401,
      statusText: 'Unauthorized',
      data: null,
    };
    mockedAxios.mockRejectedValueOnce(axiosError);

    try {
      await transport(makeCtx());
    } catch {
      // expected
    }

    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    const event = dispatchSpy.mock.calls[0]?.[0] as CustomEvent;
    expect(event.type).toBe('auth:unauthorized');

    dispatchSpy.mockRestore();
  });

  it('maps network errors (no response) to NetworkError', async () => {
    const axiosError = new Error('Network Error');
    (axiosError as unknown as Record<string, unknown>).code = 'ERR_NETWORK';
    mockedAxios.mockRejectedValueOnce(axiosError);

    await expect(transport(makeCtx())).rejects.toThrow(NetworkError);
  });

  it('preserves meta from context into response', async () => {
    mockedAxios.mockResolvedValueOnce({
      data: 'ok',
      status: 200,
      statusText: 'OK',
      headers: {},
    });

    const ctx = makeCtx({ meta: { traceId: 'abc', spanId: 'def' } });
    const result = await transport(ctx);

    expect(result.meta.traceId).toBe('abc');
    expect(result.meta.spanId).toBe('def');
  });
});
