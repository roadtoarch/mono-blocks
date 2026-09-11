/**
 * ApiClient — configured middleware pipeline for one backend.
 *
 * `createApiClient(config)` composes the standard middleware stack
 * (auth → trace → retry → headers → transport) and returns a
 * `request()` function that is the single entry-point for all HTTP
 * calls to that backend.
 *
 * A default instance is exported for the primary backend, built from
 * the application's `VITE_API_URL` env var.  A second backend would
 * get its own `createApiClient()` call with a different `baseURL`.
 *
 * @module http/api-client
 */

import { compose } from './compose';
import { createAuthMiddleware } from './middlewares/auth';
import { createHeadersMiddleware } from './middlewares/headers';
import { createRetryMiddleware } from './middlewares/retry';
import { createTraceMiddleware } from './middlewares/trace';
import { transport } from './transport';

import type { TokenProvider } from './middlewares/auth';
import type { TraceProvider } from './middlewares/trace';
import type { Middleware, RequestContext, ResponseContext, Transport } from './types';

import { env } from '@/env';

// ── Configuration ───────────────────────────────────────────────────

/**
 * Configuration for creating an ApiClient instance.
 */
export interface ApiClientConfig {
  /** Base URL for the API backend (e.g. `http://localhost:8080`). */
  baseURL: string;
  /** Callback that resolves the current access token. */
  tokenProvider: TokenProvider;
  /** Optional callback that provides an existing trace ID. */
  traceProvider?: TraceProvider;
  /** Response header names to extract into `res.meta.headers`. */
  extractHeaders?: readonly string[];
  /** Additional middlewares inserted **before** the standard stack. */
  middlewares?: readonly Middleware[];
}

// ── Factory ─────────────────────────────────────────────────────────

/**
 * Creates an ApiClient for a specific backend.
 *
 * Builds the standard middleware stack in execution order:
 * 1. `auth`   — injects `Authorization: Bearer` header
 * 2. `trace`  — injects `X-B3-TraceId` / `X-B3-SpanId` headers
 * 3. `retry`  — retries 5xx / network errors with exponential back-off
 * 4. `headers` — extracts named response headers into `res.meta.headers`
 * 5. `transport` — performs the actual HTTP request via axios
 *
 * Additional middlewares from `config.middlewares` are prepended
 * before the auth middleware (so they run first on the request path
 * and last on the response path).
 *
 * @param config - Client configuration.
 * @returns A typed `request()` function.
 *
 * @example
 * ```ts
 * // Primary backend (default export handles this)
 * const request = createApiClient({
 *   baseURL: env.VITE_API_URL,
 *   tokenProvider: oidcTokenProvider,
 * });
 *
 * // Second backend
 * const analyticsRequest = createApiClient({
 *   baseURL: 'https://analytics.example.com',
 *   tokenProvider: oidcTokenProvider,
 *   extractHeaders: ['X-RateLimit-Remaining'],
 * });
 * ```
 */
export const createApiClient = (config: ApiClientConfig): Transport => {
  const auth = createAuthMiddleware(config.tokenProvider);
  const trace = createTraceMiddleware(config.traceProvider);
  const retry = createRetryMiddleware();
  const parseHeaders = createHeadersMiddleware(config.extractHeaders ?? []);

  const standardStack: Middleware[] = [auth, trace, retry, parseHeaders];

  const allMiddlewares = [...(config.middlewares ?? []), ...standardStack];

  const pipeline = compose(allMiddlewares, transport);

  // Wrap to inject baseURL from config into every request context.
  const client: Transport = async (ctx: RequestContext): Promise<ResponseContext> => {
    const ctxWithBase: RequestContext = {
      ...ctx,
      config: {
        ...ctx.config,
        baseURL: ctx.config.baseURL ?? config.baseURL,
      },
    };

    return pipeline(ctxWithBase);
  };

  return client;
};

// ── Default instance ────────────────────────────────────────────────

/**
 * Placeholder token provider used before OIDC is initialised.
 *
 * Returns `null` (unauthenticated) — the real provider is set via
 * `setDefaultTokenProvider()` once the OIDC UserManager is ready.
 */
let defaultTokenProvider: TokenProvider = () => Promise.resolve(null);

/**
 * Replaces the default instance's token provider.
 *
 * Called once during app initialisation after the OIDC UserManager
 * is created.
 *
 * @param provider - The real token provider backed by OIDC.
 */
export const setDefaultTokenProvider = (provider: TokenProvider): void => {
  defaultTokenProvider = provider;
};

/**
 * Default ApiClient for the primary backend.
 *
 * Uses `VITE_API_URL` from the environment.  Token provider defaults
 * to `null` (no auth) until `setDefaultTokenProvider()` is called
 * during app bootstrap.
 */
export const defaultClient: Transport = createApiClient({
  baseURL: env.VITE_API_URL,
  tokenProvider: () => defaultTokenProvider(),
  extractHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
});

/**
 * Convenience: sends a request through the default ApiClient.
 *
 * @param config - Request configuration.
 * @returns The pipeline response.
 */
export const request = defaultClient;
