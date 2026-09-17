/**
 * MonoBlocks — B3 trace middleware
 *
 * Generates Zipkin B3 propagation headers (`X-B3-TraceId`, `X-B3-SpanId`)
 * per request. If a `TraceProvider` is supplied its trace ID is used;
 * otherwise a fresh 32-hex trace ID is generated per request.
 *
 * Trace and span IDs are written to `res.meta` so downstream code can
 * correlate logs with the request.
 */

import type { Middleware } from '../types';

export type TraceProvider = () => Promise<string | null>;

/**
 * Generate `length` hex characters using `crypto.getRandomValues`.
 * Falls back to `Math.random` when the Web Crypto API is unavailable
 * (e.g. older test environments).
 */
export const randomHex = (length: number): string => {
  const bytes = Math.ceil(length / 2);
  try {
    const buffer = new Uint8Array(bytes);
    crypto.getRandomValues(buffer);
    return Array.from(buffer)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, length);
  } catch {
    // Fallback for environments without crypto.getRandomValues
    let hex = '';
    for (let i = 0; i < length; i++) {
      hex += Math.floor(Math.random() * 16).toString(16);
    }
    return hex;
  }
};

/**
 * Create a B3 trace middleware.
 *
 * @param traceProvider Optional provider for a trace ID. When it returns
 *   a non-null string that value is used as the trace ID; otherwise a new
 *   one is generated.
 */
export const createTraceMiddleware = (traceProvider?: TraceProvider): Middleware => {
  return async (ctx, next) => {
    const providerTraceId = traceProvider ? await traceProvider() : null;
    const traceId = providerTraceId ?? randomHex(32);
    const spanId = randomHex(16);
    ctx.config.headers = {
      ...ctx.config.headers,
      'X-B3-TraceId': traceId,
      'X-B3-SpanId': spanId,
    };
    const res = await next();
    res.meta.traceId = traceId;
    res.meta.spanId = spanId;
    return res;
  };
};
