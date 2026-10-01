/**
 * MonoBlocks — Resource base class
 *
 * Generic base for API resources. Each resource owns a `basePath` (e.g.
 * `/api/customers`) and a `transport` function. Subclasses add domain methods
 * that call the protected `get`, `post`, `patch`, `del` helpers.
 *
 * 204 No-Content responses resolve to `undefined` for `patch` / `del`.
 */

import { HttpError } from './types';

import type { RequestConfig, RequestContext, Transport } from './types';

export class Resource<T = unknown> {
  readonly basePath: string;
  readonly transport: Transport;

  constructor(basePath: string, transport: Transport) {
    this.basePath = basePath;
    this.transport = transport;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  /** Fetch a representation. Public so resources can expose typed `get(id)`. */
  async get<R = T>(path = '', config?: Partial<RequestConfig>): Promise<R> {
    return this.request<R>('GET', path, config);
  }

  protected async post<R = T>(
    path = '',
    data?: unknown,
    config?: Partial<RequestConfig>,
  ): Promise<R> {
    return this.request<R>('POST', path, { ...config, data });
  }

  protected async patch<R = T>(
    path = '',
    data?: unknown,
    config?: Partial<RequestConfig>,
  ): Promise<R | undefined> {
    const res = await this.request<R>('PATCH', path, { ...config, data });
    // 204 No Content → undefined
    if ((res as unknown) === undefined || (res as unknown) === null) return undefined;
    return res;
  }

  protected async del<R = T>(path = '', config?: Partial<RequestConfig>): Promise<R | undefined> {
    const res = await this.request<R>('DELETE', path, config);
    if ((res as unknown) === undefined || (res as unknown) === null) return undefined;
    return res;
  }

  // ─── Core request ───────────────────────────────────────────────────────

  protected async request<R = T>(
    method: RequestConfig['method'],
    path: string,
    config?: Partial<RequestConfig>,
  ): Promise<R> {
    const url = path ? `${this.basePath}/${path}` : this.basePath;

    const fullConfig: RequestConfig = {
      url,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      ...config,
    };

    const ctx: RequestContext = {
      config: fullConfig,
      meta: {},
    };

    const res = await this.transport(ctx);
    // The axios transport resolves for every status (`validateStatus: () => true`)
    // so the body is always available; surface non-2xx as a typed HttpError here.
    if (res.status < 200 || res.status >= 300) {
      throw new HttpError(res.status, res.statusText, fullConfig.url, res.data);
    }
    return res.data as R;
  }
}
