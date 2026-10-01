/**
 * MonoBlocks — Headers middleware
 *
 * Extracts named response headers into `res.meta.headers` so downstream
 * code can read them without depending on the transport layer.
 *
 * Header names are matched case-insensitively and stored lowercased.
 */

import type { Middleware } from '../types';

/**
 * Create a middleware that extracts the specified response headers
 * into `res.meta.headers`.
 *
 * @param headerNames Header names to extract (case-insensitive).
 */
export const createHeadersMiddleware = (headerNames: readonly string[]): Middleware => {
  const lowerNames = headerNames.map((n) => n.toLowerCase());
  return async (_ctx, next) => {
    const res = await next();
    const extracted: Record<string, string> = {};
    for (const name of lowerNames) {
      if (Object.hasOwn(res.headers, name)) {
        extracted[name] = res.headers[name];
      }
    }
    res.meta.headers = extracted;
    return res;
  };
};
