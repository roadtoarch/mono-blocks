/**
 * Unit tests for connectivity/connectivity-banner — inline notification
 * that surfaces offline/online state changes.
 *
 * @module components/connectivity/connectivity-banner.unit.test
 */

import { act, render, screen } from '@testing-library/react';

import { ConnectivityBanner } from './connectivity-banner';
import { ConnectivityContext } from './connectivity-context';

import type { ConnectivityState } from './connectivity-context';

// ── Helper: render banner with a specific connectivity state ───────

const renderBanner = (state: ConnectivityState) => {
  return render(
    <ConnectivityContext value={state}>
      <ConnectivityBanner />
    </ConnectivityContext>,
  );
};

// ── Setup ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Offline notification ───────────────────────────────────────────

describe('ConnectivityBanner — offline notification', () => {
  it('shows "You are offline" warning when isOnline is false', () => {
    renderBanner({ isOnline: false, pendingCount: 0 });

    expect(screen.getByText('You are offline')).toBeInTheDocument();
  });

  it('has role="status" for screen reader accessibility', () => {
    renderBanner({ isOnline: false, pendingCount: 0 });

    const notification = screen.getByRole('status');
    expect(notification).toBeInTheDocument();
  });

  it('shows subtitle explaining offline impact', () => {
    renderBanner({ isOnline: false, pendingCount: 0 });

    expect(screen.getByText(/some features may be unavailable/i)).toBeInTheDocument();
  });
});

// ── Online (no banner) ────────────────────────────────────────────

describe('ConnectivityBanner — online (idle)', () => {
  it('renders nothing when online and no transition', () => {
    const { container } = renderBanner({ isOnline: true, pendingCount: 0 });

    expect(container.innerHTML).toBe('');
  });
});

// ── Back-online transition ─────────────────────────────────────────

describe('ConnectivityBanner — back-online transition', () => {
  it('shows "Back online" success notification after offline→online', () => {
    const { rerender } = render(
      <ConnectivityContext value={{ isOnline: false, pendingCount: 0 }}>
        <ConnectivityBanner />
      </ConnectivityContext>,
    );

    // Transition to online
    rerender(
      <ConnectivityContext value={{ isOnline: true, pendingCount: 0 }}>
        <ConnectivityBanner />
      </ConnectivityContext>,
    );

    // The showBackOnline is set via setTimeout(0)
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByText('Back online')).toBeInTheDocument();
  });

  it('auto-dismisses the "Back online" notification after 3 seconds', () => {
    const { rerender } = render(
      <ConnectivityContext value={{ isOnline: false, pendingCount: 0 }}>
        <ConnectivityBanner />
      </ConnectivityContext>,
    );

    rerender(
      <ConnectivityContext value={{ isOnline: true, pendingCount: 0 }}>
        <ConnectivityBanner />
      </ConnectivityContext>,
    );

    // Show the notification
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByText('Back online')).toBeInTheDocument();

    // Advance past the dismiss timeout
    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(screen.queryByText('Back online')).not.toBeInTheDocument();
  });

  it('has role="status" on the "Back online" notification', () => {
    const { rerender } = render(
      <ConnectivityContext value={{ isOnline: false, pendingCount: 0 }}>
        <ConnectivityBanner />
      </ConnectivityContext>,
    );

    rerender(
      <ConnectivityContext value={{ isOnline: true, pendingCount: 0 }}>
        <ConnectivityBanner />
      </ConnectivityContext>,
    );

    act(() => {
      vi.advanceTimersByTime(0);
    });

    const notification = screen.getByRole('status');
    expect(notification).toBeInTheDocument();
    expect(notification).toHaveTextContent('Back online');
  });
});
