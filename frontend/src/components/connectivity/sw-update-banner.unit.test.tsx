/**
 * Unit tests for connectivity/sw-update-banner — actionable notification
 * prompting the user to refresh when a new Service Worker version is
 * available.
 *
 * @module components/connectivity/sw-update-banner.unit.test
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('./use-sw-update', () => ({
  useSwUpdate: vi.fn(),
}));

import { SwUpdateBanner } from './sw-update-banner';
import { useSwUpdate } from './use-sw-update';

const mockSwUpdate = vi.mocked(useSwUpdate);

// ── Defaults ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockSwUpdate.mockReturnValue({ isUpdateAvailable: false, applyUpdate: vi.fn() });
});

// ── Null rendering ─────────────────────────────────────────────────

describe('SwUpdateBanner — null rendering', () => {
  it('returns null when isUpdateAvailable is false', () => {
    mockSwUpdate.mockReturnValue({ isUpdateAvailable: false, applyUpdate: vi.fn() });

    const { container } = render(<SwUpdateBanner />);

    expect(container.innerHTML).toBe('');
  });
});

// ── Notification display ───────────────────────────────────────────

describe('SwUpdateBanner — notification display', () => {
  it('shows "Update available" notification when isUpdateAvailable is true', () => {
    mockSwUpdate.mockReturnValue({ isUpdateAvailable: true, applyUpdate: vi.fn() });

    render(<SwUpdateBanner />);

    expect(screen.getByText('Update available')).toBeInTheDocument();
  });

  it('shows subtitle about new version', () => {
    mockSwUpdate.mockReturnValue({ isUpdateAvailable: true, applyUpdate: vi.fn() });

    render(<SwUpdateBanner />);

    expect(screen.getByText(/A new version is available/i)).toBeInTheDocument();
  });
});

// ── Refresh action ─────────────────────────────────────────────────

describe('SwUpdateBanner — refresh action', () => {
  it('calls applyUpdate when Refresh button is clicked', async () => {
    const applyUpdate = vi.fn();
    mockSwUpdate.mockReturnValue({ isUpdateAvailable: true, applyUpdate });

    render(<SwUpdateBanner />);

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await userEvent.click(refreshButton);

    expect(applyUpdate).toHaveBeenCalledOnce();
  });
});

// ── Accessibility ──────────────────────────────────────────────────

describe('SwUpdateBanner — accessibility', () => {
  it('has role="status" for accessibility', () => {
    mockSwUpdate.mockReturnValue({ isUpdateAvailable: true, applyUpdate: vi.fn() });

    render(<SwUpdateBanner />);

    const statusEl = screen.getByRole('status');
    expect(statusEl).toBeInTheDocument();
  });

  it('auto-focuses the wrapper on appearance', () => {
    mockSwUpdate.mockReturnValue({ isUpdateAvailable: true, applyUpdate: vi.fn() });

    render(<SwUpdateBanner />);

    // The wrapper div should receive focus via useEffect
    const statusEl = screen.getByRole('status');
    expect(statusEl).toHaveFocus();
  });
});
