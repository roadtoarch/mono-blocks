/**
 * Unit tests for connectivity/outbox-indicator — header action badge
 * that shows pending mutation count for OFFLINE_ALLOWED users.
 *
 * @module components/connectivity/outbox-indicator.unit.test
 */

import { render, screen } from '@testing-library/react';

vi.mock('./use-connectivity', () => ({
  useConnectivity: vi.fn(),
}));
vi.mock('@/offline/use-offline-allowed', () => ({
  useOfflineAllowed: vi.fn(),
}));

import { OutboxIndicator } from './outbox-indicator';
import { useConnectivity } from './use-connectivity';

import { useOfflineAllowed } from '@/offline/use-offline-allowed';

const mockConnectivity = vi.mocked(useConnectivity);
const mockOfflineAllowed = vi.mocked(useOfflineAllowed);

// ── Defaults ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockOfflineAllowed.mockReturnValue(true);
  mockConnectivity.mockReturnValue({ isOnline: false, pendingCount: 3 });
});

// ── Visibility gating ──────────────────────────────────────────────

describe('OutboxIndicator — visibility gating', () => {
  it('returns null when offlineAllowed is false', () => {
    mockOfflineAllowed.mockReturnValue(false);
    mockConnectivity.mockReturnValue({ isOnline: false, pendingCount: 5 });

    const { container } = render(<OutboxIndicator />);

    expect(container.innerHTML).toBe('');
  });

  it('returns null when pendingCount is 0', () => {
    mockOfflineAllowed.mockReturnValue(true);
    mockConnectivity.mockReturnValue({ isOnline: true, pendingCount: 0 });

    const { container } = render(<OutboxIndicator />);

    expect(container.innerHTML).toBe('');
  });

  it('renders when offlineAllowed is true and pendingCount > 0', () => {
    mockOfflineAllowed.mockReturnValue(true);
    mockConnectivity.mockReturnValue({ isOnline: false, pendingCount: 3 });

    render(<OutboxIndicator />);

    expect(screen.getByRole('button', { name: /3 pending changes? queued/i })).toBeInTheDocument();
  });
});

// ── Badge content ──────────────────────────────────────────────────

describe('OutboxIndicator — badge content', () => {
  it('shows singular label for 1 pending change', () => {
    mockConnectivity.mockReturnValue({ isOnline: false, pendingCount: 1 });

    render(<OutboxIndicator />);

    expect(screen.getByRole('button', { name: /1 pending change queued/i })).toBeInTheDocument();
  });

  it('shows plural label for multiple pending changes', () => {
    mockConnectivity.mockReturnValue({ isOnline: false, pendingCount: 5 });

    render(<OutboxIndicator />);

    expect(screen.getByRole('button', { name: /5 pending changes queued/i })).toBeInTheDocument();
  });

  it('caps badge display at 99+', () => {
    mockConnectivity.mockReturnValue({ isOnline: false, pendingCount: 150 });

    render(<OutboxIndicator />);

    // aria-label uses the raw count, but the Tag text shows 99+
    expect(screen.getByText('99+')).toBeInTheDocument();
  });
});
