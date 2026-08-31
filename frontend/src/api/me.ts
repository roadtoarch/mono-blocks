import { useQuery } from '@tanstack/react-query';

/** Base URL of the resource server, overridable via VITE_API_URL. */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

/**
 * Response contract for `GET {API_BASE_URL}/api/me`, the resource-server
 * endpoint the backend team is adding. It echoes the authenticated caller's
 * tenant id so the OIDC round-trip can be verified end to end.
 */
export interface MeResponse {
  tenant_id: string;
}

/**
 * Calls `GET /api/me` with the caller's access token as a bearer token.
 *
 * @param accessToken - OIDC access token from `useAuth().user`.
 * @param signal - AbortSignal forwarded to fetch (used by react-query).
 * @throws When the endpoint responds with a non-2xx status.
 */
export async function getMe(accessToken: string, signal?: AbortSignal): Promise<MeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });

  if (!response.ok) {
    throw new Error(`GET /api/me failed with status ${String(response.status)}`);
  }

  return (await response.json()) as MeResponse;
}

/**
 * Fetches the authenticated user's `/api/me` payload via react-query.
 * Stays disabled until an access token is available.
 *
 * @param accessToken - OIDC access token, or `undefined` while signed out.
 */
export function useMeQuery(accessToken: string | undefined) {
  return useQuery({
    queryKey: ['me', accessToken],
    enabled: accessToken !== undefined,
    queryFn: ({ signal }) => {
      if (accessToken === undefined) {
        throw new Error('useMeQuery requires an access token');
      }
      return getMe(accessToken, signal);
    },
  });
}
