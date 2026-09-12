/**
 * Unit tests for connectivity/outbox-error-notification — inline
 * notification that surfaces permanently failed outbox mutations
 * for OFFLINE_ALLOWED users.
 *
 * @module components/connectivity/outbox-error-notification.unit.test
 */

import { render, screen } from '@testing-library/react';

vi.mock('./use-connectivity', () => ({
  useConnectivity: vi.fn(),
}));
vi.mock('@/offline/use-offline-allowed', () => ({
  useOfflineAllowed: vi.fn(),
}));

import { OutboxErrorNotification } from './outbox-error-notification';
import { useConnectivity } from './use-connectivity';

import { useOfflineAllowed } from '@/offline/use-offline-allowed';

const mockConnectivity = vi.mocked(useConnectivity);
const mockOfflineAllowed = vi.mocked(useOfflineAllowed);

// ── Defaults ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockOfflineAllowed.mockReturnValue(true);
  mockConnectivity.mockReturnValue({ isOnline: true, pendingCount: 0, failedCount: 0 });
});

// ── Visibility gating ──────────────────────────────────────────────

describe('OutboxErrorNotification — visibility gating', () => {
  it('returns null when offlineAllowed is false', () => {
    mockOfflineAllowed.mockReturnValue(false);
    mockConnectivity.mockReturnValue({ isOnline: true, pendingCount: 0, failedCount: 3 });

    const { container } = render(<OutboxErrorNotification />);

    expect(container.innerHTML).toBe('');
  });

  it('returns null when failedCount is 0', () => {
    mockOfflineAllowed.mockReturnValue(true);
    mockConnectivity.mockReturnValue({ isOnline: true, pendingCount: 0, failedCount: 0 });

    const { container } = render(<OutboxErrorNotification />);

    expect(container.innerHTML).toBe('');
  });
});

// ── Error notification display ─────────────────────────────────────

describe('OutboxErrorNotification — error notification display', () => {
  it('shows error notification when failedCount > 0', () => {
    mockConnectivity.mockReturnValue({ isOnline: true, pendingCount: 0, failedCount: 2 });

    render(<OutboxErrorNotification />);

    expect(screen.getByText('Sync failed')).toBeInTheDocument();
  });

  it('uses singular "1 change" for failedCount of 1', () => {
    mockConnectivity.mockReturnValue({ isOnline: true, pendingCount: 0, failedCount: 1 });

    render(<OutboxErrorNotification />);

    expect(screen.getByText(/1 change could not be saved/i)).toBeInTheDocument();
  });

  it('uses plural "N changes" for failedCount > 1', () => {
    mockConnectivity.mockReturnValue({ isOnline: true, pendingCount: 0, failedCount: 5 });

    render(<OutboxErrorNotification />);

    expect(screen.getByText(/5 changes could not be saved/i)).toBeInTheDocument();
  });
});

// ── Accessibility ──────────────────────────────────────────────────

describe('OutboxErrorNotification — accessibility', () => {
  it('has role="alert" for accessibility', () => {
    mockConnectivity.mockReturnValue({ isOnline: true, pendingCount: 0, failedCount: 2 });

    render(<OutboxErrorNotification />);

    const alertEl = screen.getByRole('alert');
    expect(alertEl).toBeInTheDocument();
  });
});
