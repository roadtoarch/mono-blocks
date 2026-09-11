import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { UserResource } from './resources/user-resource';

import { request } from '@/http/api-client';

// Re-export types for backward compatibility.
export type { UserSummary, UsersPageResponse, InviteUserRequest } from './resources/user-resource';

const userResource = new UserResource(request);

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
    queryFn: ({ signal }) => userResource.list(page, size, signal),
  });
};

// ──────────────────────────────────────────────────────────────────────────────
// Mutation hooks
// ──────────────────────────────────────────────────────────────────────────────

/** Variables accepted by {@link useInviteUserMutation}. */
export interface InviteUserVariables {
  readonly accessToken: string;
  readonly request: import('./resources/user-resource').InviteUserRequest;
}

/**
 * TanStack Query mutation hook for inviting a new user.
 *
 * Invalidates the `users` query cache on success so the list refreshes.
 *
 * @param accessToken - OIDC access token from `useAuth().user`.
 */
export const useInviteUserMutation = (_accessToken: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: import('./resources/user-resource').InviteUserRequest) =>
      userResource.invite(request),
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
export const useUpdateUserStatusMutation = (_accessToken: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, enabled }: UpdateUserStatusVariables) =>
      userResource.updateStatus(userId, enabled),
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
export const useUpdateUserRolesMutation = (_accessToken: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, roles }: UpdateUserRolesVariables) =>
      userResource.updateRoles(userId, roles),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
