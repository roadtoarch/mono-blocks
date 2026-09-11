import { useQuery } from '@tanstack/react-query';

import { MeResource } from './resources/me-resource';

import type { MeResponse } from './resources/me-resource';

import { request } from '@/http/api-client';

// Re-export for backward compatibility.
export type { MeResponse };

const meResource = new MeResource(request);

/**
 * Fetches the authenticated user's `/api/me` payload via react-query.
 * Stays disabled until an access token is available.
 *
 * @param accessToken - OIDC access token, or `undefined` while signed out.
 */
export const useMeQuery = (accessToken: string | undefined) => {
  return useQuery({
    queryKey: ['me', accessToken],
    enabled: accessToken !== undefined,
    queryFn: ({ signal }) => meResource.me(signal),
  });
};
