/**
 * Unit tests for offline/storage-warning — inline notification alerting
 * the user when offline storage reaches warning (≥80%) or critical (≥90%).
 *
 * @module components/offline/storage-warning.unit.test
 */

import { render, screen } from '@testing-library/react';

vi.mock('@/offline/use-offline-allowed', () => ({
  useOfflineAllowed: vi.fn(),
}));
vi.mock('@/offline/use-storage-budget', () => ({
  useStorageBudget: vi.fn(),
}));

import { StorageWarning } from './storage-warning';

import { useOfflineAllowed } from '@/offline/use-offline-allowed';
import { useStorageBudget } from '@/offline/use-storage-budget';

const mockOfflineAllowed = vi.mocked(useOfflineAllowed);
const mockStorageBudget = vi.mocked(useStorageBudget);

// ── Defaults ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockOfflineAllowed.mockReturnValue(true);
  mockStorageBudget.mockReturnValue({ isWarning: false, canPin: true, usagePercent: 50 });
});

// ── Visibility gating ──────────────────────────────────────────────

describe('StorageWarning — visibility gating', () => {
  it('returns null when offlineAllowed is false', () => {
    mockOfflineAllowed.mockReturnValue(false);
    mockStorageBudget.mockReturnValue({ isWarning: true, canPin: true, usagePercent: 85 });

    const { container } = render(<StorageWarning />);

    expect(container.innerHTML).toBe('');
  });

  it('returns null when isWarning is false', () => {
    mockOfflineAllowed.mockReturnValue(true);
    mockStorageBudget.mockReturnValue({ isWarning: false, canPin: true, usagePercent: 50 });

    const { container } = render(<StorageWarning />);

    expect(container.innerHTML).toBe('');
  });
});

// ── Warning notification ───────────────────────────────────────────

describe('StorageWarning — warning notification', () => {
  it('shows warning notification when isWarning is true and canPin is true', () => {
    mockStorageBudget.mockReturnValue({ isWarning: true, canPin: true, usagePercent: 85 });

    render(<StorageWarning />);

    expect(screen.getByText('Offline storage is filling up')).toBeInTheDocument();
  });

  it('warning notification has role="status"', () => {
    mockStorageBudget.mockReturnValue({ isWarning: true, canPin: true, usagePercent: 85 });

    render(<StorageWarning />);

    const notification = screen.getByRole('status');
    expect(notification).toBeInTheDocument();
  });

  it('includes usage percentage in warning subtitle', () => {
    mockStorageBudget.mockReturnValue({ isWarning: true, canPin: true, usagePercent: 85 });

    render(<StorageWarning />);

    expect(screen.getByText(/85% capacity/)).toBeInTheDocument();
  });
});

// ── Error notification ─────────────────────────────────────────────

describe('StorageWarning — error notification', () => {
  it('shows error notification when canPin is false', () => {
    mockStorageBudget.mockReturnValue({ isWarning: true, canPin: false, usagePercent: 92 });

    render(<StorageWarning />);

    expect(screen.getByText('Storage is nearly full')).toBeInTheDocument();
  });

  it('error notification has role="alert"', () => {
    mockStorageBudget.mockReturnValue({ isWarning: true, canPin: false, usagePercent: 92 });

    render(<StorageWarning />);

    const notification = screen.getByRole('alert');
    expect(notification).toBeInTheDocument();
  });

  it('includes usage percentage in error subtitle', () => {
    mockStorageBudget.mockReturnValue({ isWarning: true, canPin: false, usagePercent: 92 });

    render(<StorageWarning />);

    expect(screen.getByText(/92% capacity/)).toBeInTheDocument();
  });
});
