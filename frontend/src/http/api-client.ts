/**
 * MonoBlocks — API client
 *
 * Composes the full middleware pipeline and exports a default `Transport`
 * ready for use by Resource classes.
 *
 * Pipeline order (outer → inner):
 *   custom middlewares → auth → trace → retry → headers → transport
 */

import { compose } from './compose';
import {
  createAuthMiddleware,
  createHeadersMiddleware,
  createRetryMiddleware,
  createTraceMiddleware,
  type TokenProvider,
  type TraceProvider,
} from './middlewares';
import { transport } from './transport';

import type { Middleware, Transport } from './types';

import { env } from '@/env';

// ─── Config ──────────────────────────────────────────────────────────────────

export interface ApiClientConfig {
  /** Base URL for all requests (e.g. `http://localhost:8080`). */
  baseURL: string;
  /** Provider for the Bearer token. Return `null` for unauthenticated requests. */
  tokenProvider: TokenProvider;
  /** Provider for a distributed trace ID. Optional. */
  traceProvider?: TraceProvider;
  /** Response header names to extract into `res.meta.headers`. Optional. */
  extractHeaders?: readonly string[];
  /** Additional middlewares to run before auth. Optional. */
  middlewares?: Middleware[];
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create a fully composed `Transport` from the given config.
 *
 * The returned transport injects `baseURL` into every request config
 * before passing it through the middleware pipeline.
 */
export function createApiClient(config: ApiClientConfig): Transport {
  const middlewares: Middleware[] = [
    ...(config.middlewares ?? []),
    createAuthMiddleware(config.tokenProvider),
  ];

  if (config.traceProvider) {
    middlewares.push(createTraceMiddleware(config.traceProvider));
  }

  middlewares.push(createRetryMiddleware());

  if (config.extractHeaders && config.extractHeaders.length > 0) {
    middlewares.push(createHeadersMiddleware(config.extractHeaders));
  }

  const pipeline = compose(middlewares, transport);

  // Wrap the pipeline to inject baseURL from config
  return async (ctx) => {
    ctx.config.baseURL = config.baseURL;
    return pipeline(ctx);
  };
}

// ─── Default client ──────────────────────────────────────────────────────────

let defaultTokenProvider: TokenProvider = async () => null;

/**
 * Set the token provider used by the default client.
 * Call this once after auth is initialised (e.g. from OIDC).
 */
export function setDefaultTokenProvider(provider: TokenProvider): void {
  defaultTokenProvider = provider;
}

/**
 * Lazily-created default API client using `env.VITE_API_URL` as base URL.
 */
const getDefaultClient = (): Transport => {
  return createApiClient({
    baseURL: env.VITE_API_URL,
    tokenProvider: defaultTokenProvider,
  });
};

/** Default transport — re-created each call to pick up token changes. */
export const request: Transport = (ctx) => getDefaultClient()(ctx);
