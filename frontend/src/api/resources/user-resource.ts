/**
 * UserResource — typed API resource for `/api/users` endpoints.
 *
 * Provides methods for listing, inviting, and managing tenant users.
 * All requests flow through the middleware pipeline.
 *
 * @module api/resources/user-resource
 */

import type { Transport } from '@/http/types';

import { Resource } from '@/http/resource';

/**
 * Single user record returned by `GET /api/users`.
 *
 * Maps to the Spring `UserSummary` DTO on the resource server.
 */
export interface UserSummary {
  readonly id: string;
  readonly username: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly email: string | null;
  readonly enabled: boolean;
  readonly roles: readonly string[];
}

/**
 * Spring `PageImpl` envelope wrapping a page of user records.
 *
 * Returned by `GET /api/users?page={page}&size={size}`.
 */
export interface UsersPageResponse {
  readonly content: readonly UserSummary[];
  readonly totalElements: number;
  readonly totalPages: number;
  readonly number: number;
  readonly size: number;
}

/**
 * Payload for `POST /api/users/invite` — sends an invitation email and creates
 * a pending user record with the selected role.
 */
export interface InviteUserRequest {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: string;
}

/**
 * API resource for the `/api/users` endpoint family.
 *
 * @param transport - Configured pipeline from `createApiClient()`.
 */
export class UserResource extends Resource<UserSummary> {
  constructor(transport: Transport) {
    super('/api/users', transport);
  }

  /**
   * Fetches a page of tenant users.
   *
   * @param page - Zero-based page index.
   * @param size - Page size (number of records per page).
   * @param signal - Optional `AbortSignal` for request cancellation.
   */
  readonly list = (
    page: number,
    size: number,
    signal?: AbortSignal,
  ): Promise<UsersPageResponse> => {
    return this.get<UsersPageResponse>('', {
      params: { page, size },
      signal,
    });
  };

  /**
   * Invites a new user by email, assigning an initial role.
   *
   * @param request - Invite payload with name, email, and role.
   * @returns The Keycloak user ID of the newly invited user.
   */
  readonly invite = (request: InviteUserRequest): Promise<string> => {
    return this.post<string>('/invite', request);
  };

  /**
   * Enables or disables a user account.
   *
   * @param userId - Keycloak user ID to update.
   * @param enabled - Whether the user should be active.
   */
  readonly updateStatus = async (userId: string, enabled: boolean): Promise<void> => {
    await this.patch(`/${encodeURIComponent(userId)}/status`, { enabled });
  };

  /**
   * Replaces the role assignments for a user.
   *
   * @param userId - Keycloak user ID to update.
   * @param roles - Complete list of role names the user should hold.
   */
  readonly updateRoles = async (userId: string, roles: string[]): Promise<void> => {
    await this.patch(`/${encodeURIComponent(userId)}/roles`, { roles });
  };
}
