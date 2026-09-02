import { useQuery } from '@tanstack/react-query';

import { apiGet } from './client.ts';

/**
 * Response contract for `GET {API_BASE_URL}/api/me` — echoes the
 * authenticated caller's tenant id so the OIDC round-trip can be
 * verified end to end.
 */
export interface MeResponse {
  tenant_id: string;
}

/**
 * Calls `GET /api/me` with the caller's access token as a bearer token.
 *
 * @param accessToken - OIDC access token from `useAuth().user`.
 * @param signal - `AbortSignal` forwarded to fetch (used by react-query).
 * @throws When the endpoint responds with a non-2xx status.
 */
export function getMe(accessToken: string, signal?: AbortSignal): Promise<MeResponse> {
  return apiGet<MeResponse>('/api/me', accessToken, signal);
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
