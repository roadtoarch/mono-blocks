import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPatch, apiPost } from './client.ts';

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
 * Fetches a page of tenant users from `GET /api/users`.
 *
 * @param accessToken - OIDC bearer token from `useAuth().user`.
 * @param page - Zero-based page index.
 * @param size - Page size (number of records per page).
 * @param signal - Optional `AbortSignal` forwarded to `fetch`.
 * @throws When the endpoint responds with a non-2xx status.
 */
export const getUsers = (
  accessToken: string,
  page: number,
  size: number,
  signal?: AbortSignal,
): Promise<UsersPageResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  return apiGet<UsersPageResponse>(`/api/users?${params.toString()}`, accessToken, signal);
};

/**
 * React Query hook for fetching the tenant's user list.
 *
 * Stays disabled until an access token is available, matching the
 * pattern established by {@link ./me.ts | useMeQuery}.
 *
 * @param accessToken - OIDC access token, or `undefined` while signed out.
 * @param page - Zero-based page index forwarded to the backend.
 * @param size - Number of records per page.
 */
export const useUsersQuery = (accessToken: string | undefined, page: number, size: number) => {
  return useQuery({
    queryKey: ['users', accessToken, page, size],
    enabled: accessToken !== undefined,
    queryFn: ({ signal }) => {
      if (accessToken === undefined) {
        throw new Error('useUsersQuery requires an access token');
      }
      return getUsers(accessToken, page, size, signal);
    },
  });
};

// ──────────────────────────────────────────────────────────────────────────────
// Mutation functions
// ──────────────────────────────────────────────────────────────────────────────

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
 * Invites a new user by email, assigning an initial role.
 *
 * @param accessToken - OIDC bearer token from `useAuth().user`.
 * @param request - Invite payload with name, email, and role.
 * @returns The Keycloak user ID of the newly invited user.
 * @throws When the endpoint responds with a non-2xx status.
 */
export const inviteUser = (accessToken: string, request: InviteUserRequest): Promise<string> => {
  return apiPost<string>('/api/users/invite', accessToken, request);
};

/**
 * Enables or disables a user account via `PATCH /api/users/{id}/status`.
 *
 * @param accessToken - OIDC bearer token from `useAuth().user`.
 * @param userId - Keycloak user ID to update.
 * @param enabled - Whether the user should be active.
 * @throws When the endpoint responds with a non-2xx status.
 */
export const updateUserStatus = async (
  accessToken: string,
  userId: string,
  enabled: boolean,
): Promise<void> => {
  await apiPatch(`/api/users/${encodeURIComponent(userId)}/status`, accessToken, { enabled });
};

/**
 * Replaces the role assignments for a user via `PATCH /api/users/{id}/roles`.
 *
 * @param accessToken - OIDC bearer token from `useAuth().user`.
 * @param userId - Keycloak user ID to update.
 * @param roles - Complete list of role names the user should hold.
 * @throws When the endpoint responds with a non-2xx status.
 */
export const updateUserRoles = async (
  accessToken: string,
  userId: string,
  roles: string[],
): Promise<void> => {
  await apiPatch(`/api/users/${encodeURIComponent(userId)}/roles`, accessToken, { roles });
};

// ──────────────────────────────────────────────────────────────────────────────
// Mutation hooks
// ──────────────────────────────────────────────────────────────────────────────

/** Variables accepted by {@link useInviteUserMutation}. */
export interface InviteUserVariables {
  readonly accessToken: string;
  readonly request: InviteUserRequest;
}

/**
 * TanStack Query mutation hook for inviting a new user.
 *
 * Invalidates the `users` query cache on success so the list refreshes.
 *
 * @param accessToken - OIDC access token from `useAuth().user`.
 */
export const useInviteUserMutation = (accessToken: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: InviteUserRequest) => inviteUser(accessToken, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

/** Variables accepted by {@link useUpdateUserStatusMutation}. */
export interface UpdateUserStatusVariables {
  readonly userId: string;
  readonly enabled: boolean;
}

/**
 * TanStack Query mutation hook for enabling/disabling a user account.
 *
 * Invalidates the `users` query cache on success so the list refreshes.
 *
 * @param accessToken - OIDC access token from `useAuth().user`.
 */
export const useUpdateUserStatusMutation = (accessToken: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, enabled }: UpdateUserStatusVariables) =>
      updateUserStatus(accessToken, userId, enabled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

/** Variables accepted by {@link useUpdateUserRolesMutation}. */
export interface UpdateUserRolesVariables {
  readonly userId: string;
  readonly roles: string[];
}

/**
 * TanStack Query mutation hook for replacing a user's role assignments.
 *
 * Invalidates the `users` query cache on success so the list refreshes.
 *
 * @param accessToken - OIDC access token from `useAuth().user`.
 */
export const useUpdateUserRolesMutation = (accessToken: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, roles }: UpdateUserRolesVariables) =>
      updateUserRoles(accessToken, userId, roles),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
