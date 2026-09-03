import { env } from '../env';

/** Base URL of the resource server, validated via env module. */
export const API_BASE_URL: string = env.VITE_API_URL;

/**
 * Fires a custom event that the app shell catches to force a login redirect
 * when the resource server rejects the access token.
 */
function dispatchUnauthorized(): void {
  globalThis.dispatchEvent(new CustomEvent('auth:unauthorized'));
}

/**
 * Authenticated `GET` helper — attaches a bearer token and dispatches
 * `auth:unauthorized` on a `401` so the shell can redirect to login.
 *
 * @typeParam T - Expected response body shape.
 * @param path - Path relative to {@link API_BASE_URL}, e.g. `/api/me`.
 * @param accessToken - OIDC access token from `useAuth().user`.
 * @param signal - Optional `AbortSignal` forwarded to `fetch`.
 * @throws When the endpoint responds with a non-2xx status.
 */
export async function apiGet<T>(
  path: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });

  if (response.status === 401) {
    dispatchUnauthorized();
  }

  if (!response.ok) {
    throw new Error(`GET ${path} failed with status ${String(response.status)}`);
  }

  return (await response.json()) as T;
}

/**
 * Authenticated `POST` helper — serialises the body as JSON, attaches a bearer
 * token, and dispatches `auth:unauthorized` on a `401`.
 *
 * @typeParam T - Expected response body shape.
 * @param path - Path relative to {@link API_BASE_URL}, e.g. `/api/users/invite`.
 * @param accessToken - OIDC access token from `useAuth().user`.
 * @param body - Payload to serialise as JSON.
 * @throws When the endpoint responds with a non-2xx status.
 */
export async function apiPost<T>(path: string, accessToken: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    dispatchUnauthorized();
  }

  if (!response.ok) {
    throw new Error(`POST ${path} failed with status ${String(response.status)}`);
  }

  // 204 No Content — nothing to deserialise.
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return (await response.json()) as T;
}

/**
 * Authenticated `PATCH` helper — serialises the body as JSON, attaches a bearer
 * token, and dispatches `auth:unauthorized` on a `401`.
 *
 * @typeParam T - Expected response body shape.
 * @param path - Path relative to {@link API_BASE_URL}, e.g. `/api/users/{id}/status`.
 * @param accessToken - OIDC access token from `useAuth().user`.
 * @param body - Payload to serialise as JSON.
 * @throws When the endpoint responds with a non-2xx status.
 */
export async function apiPatch<T>(path: string, accessToken: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    dispatchUnauthorized();
  }

  if (!response.ok) {
    throw new Error(`PATCH ${path} failed with status ${String(response.status)}`);
  }

  // 204 No Content — nothing to deserialise.
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return (await response.json()) as T;
}
