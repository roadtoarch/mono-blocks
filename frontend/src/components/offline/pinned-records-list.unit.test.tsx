/**
 * Unit tests for offline/pinned-records-list — settings-style list of
 * pinned records grouped by entity type with unpin action per record.
 *
 * @module components/offline/pinned-records-list.unit.test
 */

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuth } from 'react-oidc-context';

vi.mock('@/offline/use-offline-allowed', () => ({
  useOfflineAllowed: vi.fn(),
}));
vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(),
}));
vi.mock('@/offline/pin-adapter', () => ({
  pinAdapter: {
    getAll: vi.fn(),
    unpin: vi.fn(),
  },
}));

import { PinnedRecordsList } from './pinned-records-list';

import { pinAdapter } from '@/offline/pin-adapter';
import { useOfflineAllowed } from '@/offline/use-offline-allowed';

const mockOfflineAllowed = vi.mocked(useOfflineAllowed);
const mockAuth = vi.mocked(useAuth);
const mockGetAll = vi.mocked(pinAdapter.getAll);
const mockUnpin = vi.mocked(pinAdapter.unpin);

// ── Test fixtures ──────────────────────────────────────────────────

const USER_ID = 'user-123';

const makeRecord = (contentType: string, contentId: string, estimatedSizeBytes: number) => ({
  userId: USER_ID,
  contentType,
  contentId,
  pinnedAt: '2026-01-15T10:00:00.000Z',
  estimatedSizeBytes,
});

// ── Defaults ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockOfflineAllowed.mockReturnValue(true);
  mockAuth.mockReturnValue({
    isAuthenticated: true,
    user: { profile: { sub: USER_ID } } as never,
  } as never);
  mockGetAll.mockResolvedValue([]);
  mockUnpin.mockResolvedValue(undefined);
});

// ── Visibility gating ──────────────────────────────────────────────

describe('PinnedRecordsList — visibility gating', () => {
  it('returns null when offlineAllowed is false', () => {
    mockOfflineAllowed.mockReturnValue(false);

    const { container } = render(<PinnedRecordsList />);

    expect(container.innerHTML).toBe('');
  });

  it('returns null when no pinned records', async () => {
    mockGetAll.mockResolvedValue([]);

    const { container } = render(<PinnedRecordsList />);

    await act(async () => {});

    expect(container.innerHTML).toBe('');
  });
});

// ── Grouped records ────────────────────────────────────────────────

describe('PinnedRecordsList — grouped records', () => {
  it('shows grouped records by contentType', async () => {
    const records = [
      makeRecord('user', 'user-1', 2048),
      makeRecord('user', 'user-2', 4096),
      makeRecord('me', 'me-1', 1024),
    ];
    mockGetAll.mockResolvedValue(records);

    render(<PinnedRecordsList />);

    await act(async () => {});

    // Should show capitalized entity type headings
    expect(screen.getByText(/User \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Me \(1\)/)).toBeInTheDocument();
  });

  it('displays contentId and formatted size per record', async () => {
    const records = [makeRecord('user', 'user-1', 2048), makeRecord('user', 'user-2', 1_500_000)];
    mockGetAll.mockResolvedValue(records);

    render(<PinnedRecordsList />);

    await act(async () => {});

    expect(screen.getByText('user-1')).toBeInTheDocument();
    expect(screen.getByText('2.0 KiB')).toBeInTheDocument();
    expect(screen.getByText('user-2')).toBeInTheDocument();
    expect(screen.getByText('1.4 MiB')).toBeInTheDocument();
  });
});

// ── Unpin action ───────────────────────────────────────────────────

describe('PinnedRecordsList — unpin action', () => {
  it('calls pinAdapter.unpin when unpin button is clicked', async () => {
    const records = [makeRecord('user', 'user-1', 2048)];
    mockGetAll.mockResolvedValue(records);

    render(<PinnedRecordsList />);

    await act(async () => {});

    const unpinButton = screen.getByRole('button', { name: /unpin user-1/i });
    await userEvent.click(unpinButton);

    expect(mockUnpin).toHaveBeenCalledOnce();
    expect(mockUnpin).toHaveBeenCalledWith(USER_ID, 'user', 'user-1');
  });

  it('removes record from list after unpin', async () => {
    const records = [makeRecord('user', 'user-1', 2048)];
    mockGetAll.mockResolvedValue(records);

    render(<PinnedRecordsList />);

    await act(async () => {});

    expect(screen.getByText('user-1')).toBeInTheDocument();

    const unpinButton = screen.getByRole('button', { name: /unpin user-1/i });
    await userEvent.click(unpinButton);

    expect(screen.queryByText('user-1')).not.toBeInTheDocument();
  });
});
