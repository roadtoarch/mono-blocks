/**
 * MeResource — typed API resource for `GET /api/me`.
 *
 * Provides a single `me()` method that returns the authenticated
 * user's tenant information.  All requests flow through the
 * middleware pipeline.
 *
 * @module api/resources/me-resource
 */

import type { Transport } from '@/http/types';

import { Resource } from '@/http/resource';

/**
 * Response contract for `GET /api/me` — echoes the authenticated
 * caller's tenant id so the OIDC round-trip can be verified end to end.
 */
export interface MeResponse {
  readonly tenant_id: string;
}

/**
 * API resource for the `/api/me` endpoint.
 *
 * @param transport - Configured pipeline from `createApiClient()`.
 */
export class MeResource extends Resource<MeResponse> {
  constructor(transport: Transport) {
    super('/api/me', transport);
  }

  /**
   * Fetches the authenticated user's tenant information.
   *
   * @param signal - Optional `AbortSignal` for request cancellation.
   * @returns The `/api/me` response payload.
   */
  readonly me = (signal?: AbortSignal): Promise<MeResponse> => {
    return this.get<MeResponse>('', { signal });
  };
}
