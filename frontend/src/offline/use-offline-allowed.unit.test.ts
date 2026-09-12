/**
 * Unit tests for offline/use-offline-allowed — OFFLINE_ALLOWED role gate hook.
 *
 * @module offline/use-offline-allowed.unit.test
 */

import { renderHook } from '@testing-library/react';
// Mock react-oidc-context so we can control the auth state.
// The mock call is hoisted above imports by Vitest.
vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(),
}));
import { useAuth } from 'react-oidc-context';

import { useOfflineAllowed } from './use-offline-allowed';

const mockUseAuth = vi.mocked(useAuth);

// ── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useOfflineAllowed', () => {
  it('returns false when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: undefined,
    } as unknown as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useOfflineAllowed());
    expect(result.current).toBe(false);
  });

  it('returns false when user is authenticated but has no user object', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: undefined,
    } as unknown as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useOfflineAllowed());
    expect(result.current).toBe(false);
  });

  it('returns false when realm_access claim is missing', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { profile: {} },
    } as unknown as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useOfflineAllowed());
    expect(result.current).toBe(false);
  });

  it('returns false when realm_access.roles is an empty array', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { profile: { realm_access: { roles: [] } } },
    } as unknown as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useOfflineAllowed());
    expect(result.current).toBe(false);
  });

  it('returns false when OFFLINE_ALLOWED role is not in the roles list', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { profile: { realm_access: { roles: ['USER', 'ADMIN'] } } },
    } as unknown as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useOfflineAllowed());
    expect(result.current).toBe(false);
  });

  it('returns true when OFFLINE_ALLOWED role is present', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { profile: { realm_access: { roles: ['USER', 'OFFLINE_ALLOWED', 'ADMIN'] } } },
    } as unknown as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useOfflineAllowed());
    expect(result.current).toBe(true);
  });
});
