/**
 * MonoBlocks — Axios transport
 *
 * The **only** file that imports axios. Maps axios responses to our
 * `ResponseContext` and axios errors to our error hierarchy.
 *
 * Dispatches a `CustomEvent('auth:unauthorized')` on 401 responses so the
 * auth layer can react without coupling to this module.
 */

import axios from 'axios';

import { AbortError, HttpError, NetworkError } from './types';

import type { RequestContext, ResponseContext } from './types';

// ─── Header normalisation ────────────────────────────────────────────────────

/**
 * Normalise various header representations into a flat `Record<string, string>`.
 * Handles `Headers` objects, plain records (including axios header maps),
 * or `undefined`. Non-string values are stringified; nullish values dropped.
 */
export const normalizeHeaders = (
  headers: Record<string, unknown> | Headers | undefined,
): Record<string, string> => {
  if (headers == null) {
    return {};
  }
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      out[key] = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = String(value);
    }
  }
  return out;
};

// ─── Error mapping ───────────────────────────────────────────────────────────

/**
 * Structural view of the axios error fields this transport reads. Declared
 * locally so we narrow the `unknown` error without an `any` cast.
 */
interface TransportError {
  code?: string;
  message?: string;
  config?: { url?: string; signal?: { aborted?: boolean } };
  response?: { status: number; statusText?: string; data?: unknown };
}

function isTransportError(value: unknown): value is TransportError {
  return typeof value === 'object' && value !== null;
}

function mapAxiosError(error: unknown): never {
  if (!isTransportError(error)) {
    throw new NetworkError();
  }

  // Abort — cancelled via AbortSignal or axios timeout abort
  if (
    error.code === 'ERR_CANCELED' ||
    (error.code === 'ECONNABORTED' && error.config?.signal?.aborted)
  ) {
    throw new AbortError();
  }

  // HTTP error — server responded with a non-2xx status
  if (error.response) {
    const path = error.config?.url ?? '/';
    const { status, statusText, data } = error.response;

    if (status === 401) {
      globalThis.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    throw new HttpError(status, statusText ?? '', path, data);
  }

  // Network error — no response at all
  throw new NetworkError(error.message);
}

// ─── Transport ───────────────────────────────────────────────────────────────

/**
 * Execute an HTTP request via axios and return a normalised `ResponseContext`.
 *
 * This is the terminal handler in the middleware pipeline — the only place
 * where axios is actually called.
 */
export const transport = async (ctx: RequestContext): Promise<ResponseContext> => {
  const { config } = ctx;
  const axiosConfig: import('axios').AxiosRequestConfig = {
    url: config.url,
    method: config.method,
    baseURL: config.baseURL,
    headers: config.headers,
    params: config.params,
    data: config.data,
    signal: config.signal,
    timeout: config.timeout,
    responseType: config.responseType,
    validateStatus: () => true, // we handle status codes ourselves
  };
  try {
    const res = await axios(axiosConfig);
    return {
      data: res.data,
      status: res.status,
      statusText: res.statusText,
      headers: normalizeHeaders(res.headers),
      meta: { ...ctx.meta },
      config,
    };
  } catch (error) {
    mapAxiosError(error);
  }
};
