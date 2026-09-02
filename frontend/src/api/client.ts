/** Base URL of the resource server, overridable via `VITE_API_URL`. */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

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
