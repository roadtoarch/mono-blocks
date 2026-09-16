/**
 * MonoBlocks — HTTP pipeline barrel
 *
 * Re-exports the public API of the HTTP middleware pipeline.
 */

// Core types and error hierarchy
export type {
  HttpMethod,
  RequestConfig,
  RequestContext,
  ResponseContext,
  Middleware,
  Transport,
} from './types';
export { ApiError, HttpError, NetworkError, AbortError } from './types';

// Compose
export { compose } from './compose';

// Transport (axios boundary)
export { transport, normalizeHeaders } from './transport';

// API client
export {
  createApiClient,
  request,
  setDefaultTokenProvider,
  type ApiClientConfig,
} from './api-client';

// Middlewares
export {
  createAuthMiddleware,
  type TokenProvider,
  createTraceMiddleware,
  type TraceProvider,
  randomHex,
  createRetryMiddleware,
  createHeadersMiddleware,
  createOfflineMiddleware,
  createCacheMiddleware,
} from './middlewares';
