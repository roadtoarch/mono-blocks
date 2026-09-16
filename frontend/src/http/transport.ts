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

import type { RequestConfig, RequestContext, ResponseContext } from './types';

// ─── Header normalisation ────────────────────────────────────────────────────

/**
 * Normalise various header representations into a flat `Record<string, string>`.
 * Handles: `Headers` objects, plain records, or `undefined`.
 */
export function normalizeHeaders(
  headers: Record<string, string> | Headers | undefined,
): Record<string, string> {
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

  return { ...headers };
}

// ─── Error mapping ───────────────────────────────────────────────────────────

function mapAxiosError(error: unknown): never {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const err = error as any;

  // Abort — cancelled via AbortSignal or axios timeout abort
  if (err.code === 'ERR_CANCELED' || (err.code === 'ECONNABORTED' && err.config?.signal?.aborted)) {
    throw new AbortError();
  }

  // HTTP error — server responded with a non-2xx status
  if (err.response) {
    const path = err.config?.url ?? '/';
    const status: number = err.response.status;
    const statusText: string = err.response.statusText ?? '';

    if (status === 401) {
      globalThis.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    throw new HttpError(status, statusText, path, err.response.data);
  }

  // Network error — no response at all
  throw new NetworkError(err.message);
}

// ─── Transport ───────────────────────────────────────────────────────────────

/**
 * Execute an HTTP request via axios and return a normalised `ResponseContext`.
 *
 * This is the terminal handler in the middleware pipeline — the only place
 * where axios is actually called.
 */
export async function transport(ctx: RequestContext): Promise<ResponseContext> {
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
}
