/**
 * MonoBlocks — HTTP pipeline types
 *
 * Core type definitions for the Koa-style middleware pipeline.
 * Every request flows through middlewares and a single transport function,
 * making each concern (auth, tracing, retry) unit-testable in isolation.
 */

// ─── HTTP Method ──────────────────────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

// ─── Request ──────────────────────────────────────────────────────────────────

export interface RequestConfig {
  url: string;
  method: HttpMethod;
  baseURL?: string;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  data?: unknown;
  signal?: AbortSignal;
  timeout?: number;
  responseType?: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream';
}

export interface RequestContext {
  config: RequestConfig;
  /** Bag for middleware-to-middleware communication (retry count, trace IDs, etc.). */
  meta: Record<string, unknown>;
}

// ─── Response ─────────────────────────────────────────────────────────────────

export interface ResponseContext<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  meta: Record<string, unknown>;
  config: RequestConfig;
}

// ─── Pipeline signatures ──────────────────────────────────────────────────────

export type Middleware = (
  ctx: RequestContext,
  next: () => Promise<ResponseContext>,
) => Promise<ResponseContext>;

export type Transport = (ctx: RequestContext) => Promise<ResponseContext>;

// ─── Error hierarchy ──────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export class HttpError extends ApiError {
  readonly status: number;
  readonly statusText: string;
  readonly path: string;
  readonly body: unknown;

  constructor(status: number, statusText: string, path: string, body?: unknown) {
    super(`HTTP ${String(status)} ${statusText} — ${path}`);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.path = path;
    this.body = body;
  }
}

export class NetworkError extends ApiError {
  constructor(message = 'Network error') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AbortError extends ApiError {
  constructor(message = 'Request aborted') {
    super(message);
    this.name = 'AbortError';
  }
}
