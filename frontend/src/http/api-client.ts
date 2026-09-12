/**
 * ApiClient — configured middleware pipeline for one backend.
 *
 * `createApiClient(config)` composes the standard middleware stack
 * (auth → trace → retry → headers → cache → offline → transport)
 * and returns a `request()` function that is the single entry-point
 * for all HTTP calls to that backend.
 *
 * A default instance is exported for the primary backend, built from
 * the application's `VITE_API_URL` env var.  A second backend would
 * get its own `createApiClient()` call with a different `baseURL`.
 *
 * @module http/api-client
 */

import { compose } from './compose';
import { createAuthMiddleware } from './middlewares/auth';
import { createCacheMiddleware } from './middlewares/cache';
import { createHeadersMiddleware } from './middlewares/headers';
import { createOfflineMiddleware } from './middlewares/offline';
import { createRetryMiddleware } from './middlewares/retry';
import { createTraceMiddleware } from './middlewares/trace';
import { transport } from './transport';

import type { TokenProvider } from './middlewares/auth';
import type { TraceProvider } from './middlewares/trace';
import type { CacheAdapter, OutboxAdapter } from './middlewares/types';
import type { Middleware, RequestContext, ResponseContext, Transport } from './types';

import { cacheAdapter as defaultCacheAdapter } from '@/db/cache-adapter';
import { outboxAdapter as defaultOutboxAdapter } from '@/db/outbox-adapter';
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
  /** Cache adapter for the cache middleware. Defaults to DexieCacheAdapter. */
  cacheAdapter?: CacheAdapter;
  /** TTL in ms for cached GET responses. Defaults to VITE_OFFLINE_STALE_AGE_MS. */
  cacheTtlMs?: number;
  /** Max entries in the HTTP cache. Defaults to 200. */
  cacheMaxEntries?: number;
  /** Outbox adapter for the offline middleware. Defaults to DexieOutboxAdapter. */
  outboxAdapter?: OutboxAdapter;
  /** Predicate: returns true when browser is online. Defaults to `() => navigator.onLine`. */
  onlinePredicate?: () => boolean;
  /** Predicate: returns true when user has OFFLINE_ALLOWED role. */
  isOfflineAllowed?: () => boolean | Promise<boolean>;
  /** Async function returning the current user's OIDC `sub` claim. */
  getUserId?: () => Promise<string | undefined>;
  /** Additional middlewares inserted **before** the standard stack. */
  middlewares?: readonly Middleware[];
}

// ── Factory ─────────────────────────────────────────────────────────

/**
 * Creates an ApiClient for a specific backend.
 *
 * Builds the standard middleware stack in execution order:
 * 1. `auth`    — injects `Authorization: Bearer` header
 * 2. `trace`   — injects `X-B3-TraceId` / `X-B3-SpanId` headers
 * 3. `retry`   — retries 5xx / network errors with exponential back-off
 * 4. `headers` — extracts named response headers into `res.meta.headers`
 * 5. `cache`   — read-through HTTP response cache with TTL and dedup
 * 6. `offline` — queues mutations when offline (OFFLINE_ALLOWED users)
 * 7. `transport` — performs the actual HTTP request via axios
 *
 * Additional middlewares from `config.middlewares` are prepended
 * before the auth middleware (so they run first on the request path
 * and last on the response path).
 *
 * @param config - Client configuration.
 * @returns A typed `request()` function.
 */
export const createApiClient = (config: ApiClientConfig): Transport => {
  const auth = createAuthMiddleware(config.tokenProvider);
  const trace = createTraceMiddleware(config.traceProvider);
  const retry = createRetryMiddleware();
  const parseHeaders = createHeadersMiddleware(config.extractHeaders ?? []);

  const cache = createCacheMiddleware({
    adapter: config.cacheAdapter ?? defaultCacheAdapter,
    ttlMs: config.cacheTtlMs ?? env.VITE_OFFLINE_STALE_AGE_MS,
    maxEntries: config.cacheMaxEntries ?? 200,
  });

  const offline = createOfflineMiddleware({
    adapter: config.outboxAdapter ?? defaultOutboxAdapter,
    onlinePredicate: config.onlinePredicate ?? (() => navigator.onLine),
    isOfflineAllowed: config.isOfflineAllowed ?? (() => defaultOfflineAllowed()),
    getUserId: config.getUserId ?? (() => defaultUserIdProvider()),
  });

  const standardStack: Middleware[] = [auth, trace, retry, parseHeaders, cache, offline];

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

// ── Default instance providers ───────────────────────────────────────

/**
 * Placeholder token provider used before OIDC is initialised.
 *
 * Returns `null` (unauthenticated) — the real provider is set via
 * `setDefaultTokenProvider()` once the OIDC UserManager is ready.
 */
let defaultTokenProvider: TokenProvider = () => Promise.resolve(null);

/**
 * Placeholder offline-allowed predicate.
 *
 * Returns `false` until `setDefaultOfflinePredicate()` is called
 * during app bootstrap with the real OIDC-backed check.
 */
let defaultOfflineAllowed = (): boolean | Promise<boolean> => false;

/**
 * Placeholder user ID provider.
 *
 * Returns `undefined` until `setDefaultUserIdProvider()` is called
 * during app bootstrap.
 */
let defaultUserIdProvider = (): Promise<string | undefined> => Promise.resolve(undefined);

// ── Setters (called during app bootstrap) ────────────────────────────

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
 * Replaces the default instance's offline-allowed predicate.
 *
 * Called once during app initialisation after the OIDC UserManager
 * is created and the user's roles can be inspected.
 *
 * @param predicate - Returns `true` when the user has OFFLINE_ALLOWED role.
 */
export const setDefaultOfflinePredicate = (predicate: () => boolean | Promise<boolean>): void => {
  defaultOfflineAllowed = predicate;
};

/**
 * Replaces the default instance's user ID provider.
 *
 * Called once during app initialisation after the OIDC UserManager
 * is created.
 *
 * @param provider - Async function returning the current user's OIDC `sub` claim.
 */
export const setDefaultUserIdProvider = (provider: () => Promise<string | undefined>): void => {
  defaultUserIdProvider = provider;
};

// ── Default instance ────────────────────────────────────────────────

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
