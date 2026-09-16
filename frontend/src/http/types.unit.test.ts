/**
 * MonoBlocks — http/types.unit.test.ts
 *
 * Unit tests for the HTTP pipeline type definitions (error hierarchy).
 */

import { describe, expect, it } from 'vitest';

import { ApiError, AbortError, HttpError, NetworkError } from './types.ts';

// ── ApiError ────────────────────────────────────────────────────────────────

describe('ApiError', () => {
  it('sets name and message', () => {
    const err = new ApiError('something went wrong');
    expect(err.name).toBe('ApiError');
    expect(err.message).toBe('something went wrong');
  });

  it('is an instance of Error and ApiError', () => {
    const err = new ApiError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });
});

// ── HttpError ───────────────────────────────────────────────────────────────

describe('HttpError', () => {
  it('sets name, status, statusText, path, and body', () => {
    const err = new HttpError(404, 'Not Found', '/api/users/1', { detail: 'missing' });
    expect(err.name).toBe('HttpError');
    expect(err.status).toBe(404);
    expect(err.statusText).toBe('Not Found');
    expect(err.path).toBe('/api/users/1');
    expect(err.body).toEqual({ detail: 'missing' });
  });

  it('formats message as "HTTP {status} {statusText} — {path}"', () => {
    const err = new HttpError(500, 'Internal Server Error', '/api/health');
    expect(err.message).toBe('HTTP 500 Internal Server Error — /api/health');
  });

  it('body defaults to undefined', () => {
    const err = new HttpError(403, 'Forbidden', '/api/secret');
    expect(err.body).toBeUndefined();
  });

  it('is an instance of ApiError', () => {
    const err = new HttpError(400, 'Bad Request', '/');
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(HttpError);
  });
});

// ── NetworkError ────────────────────────────────────────────────────────────

describe('NetworkError', () => {
  it('sets name and default message', () => {
    const err = new NetworkError();
    expect(err.name).toBe('NetworkError');
    expect(err.message).toBe('Network error');
  });

  it('accepts a custom message', () => {
    const err = new NetworkError('connection refused');
    expect(err.message).toBe('connection refused');
  });

  it('is an instance of ApiError', () => {
    const err = new NetworkError();
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(NetworkError);
  });
});

// ── AbortError ──────────────────────────────────────────────────────────────

describe('AbortError', () => {
  it('sets name and default message', () => {
    const err = new AbortError();
    expect(err.name).toBe('AbortError');
    expect(err.message).toBe('Request aborted');
  });

  it('accepts a custom message', () => {
    const err = new AbortError('user cancelled');
    expect(err.message).toBe('user cancelled');
  });

  it('is an instance of ApiError', () => {
    const err = new AbortError();
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(AbortError);
  });
});
