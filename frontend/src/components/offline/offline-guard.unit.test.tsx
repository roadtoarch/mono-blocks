/**
 * Unit tests for offline/offline-guard — 5-second debounce guard that
 * shows an unavailable message for non-offline-available routes.
 *
 * @module components/offline/offline-guard.unit.test
 */

import { act, render, screen } from '@testing-library/react';

vi.mock('@/components/connectivity/use-connectivity', () => ({
  useConnectivity: vi.fn(),
}));
vi.mock('@/offline/use-offline-allowed', () => ({
  useOfflineAllowed: vi.fn(),
}));

import { OfflineGuard } from './offline-guard';

import { useConnectivity } from '@/components/connectivity/use-connectivity';
import { useOfflineAllowed } from '@/offline/use-offline-allowed';

const mockConnectivity = vi.mocked(useConnectivity);
const mockOfflineAllowed = vi.mocked(useOfflineAllowed);

// ── Defaults ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockConnectivity.mockReturnValue({ isOnline: true, pendingCount: 0 });
  mockOfflineAllowed.mockReturnValue(true);
});

// ── Children passthrough ───────────────────────────────────────────

describe('OfflineGuard — children passthrough', () => {
  it('renders children when online', () => {
    mockConnectivity.mockReturnValue({ isOnline: true, pendingCount: 0 });

    render(
      <OfflineGuard isOfflineAvailable={false}>
        <div>Page content</div>
      </OfflineGuard>,
    );

    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('renders children when offline but route is offline-available', () => {
    mockConnectivity.mockReturnValue({ isOnline: false, pendingCount: 0 });

    render(
      <OfflineGuard isOfflineAvailable>
        <div>Offline page content</div>
      </OfflineGuard>,
    );

    expect(screen.getByText('Offline page content')).toBeInTheDocument();
  });

  it('renders children when offline but user does NOT have OFFLINE_ALLOWED', () => {
    mockConnectivity.mockReturnValue({ isOnline: false, pendingCount: 0 });
    mockOfflineAllowed.mockReturnValue(false);

    render(
      <OfflineGuard isOfflineAvailable={false}>
        <div>Page content</div>
      </OfflineGuard>,
    );

    expect(screen.getByText('Page content')).toBeInTheDocument();
  });
});

// ── Debounce behavior (DEC-10: 5-second debounce) ─────────────────

describe('OfflineGuard — 5-second debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children during the debounce period', () => {
    mockConnectivity.mockReturnValue({ isOnline: false, pendingCount: 0 });

    render(
      <OfflineGuard isOfflineAvailable={false}>
        <div>Page content</div>
      </OfflineGuard>,
    );

    // Before the 5s debounce elapses, children are still visible.
    act(() => {
      vi.advanceTimersByTime(4_999);
    });

    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('shows OfflineUnavailable after 5 seconds', () => {
    mockConnectivity.mockReturnValue({ isOnline: false, pendingCount: 0 });

    render(
      <OfflineGuard isOfflineAvailable={false}>
        <div>Page content</div>
      </OfflineGuard>,
    );

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(screen.queryByText('Page content')).not.toBeInTheDocument();
    expect(screen.getByText('Content unavailable offline')).toBeInTheDocument();
  });

  it('cancels the debounce timer if connectivity returns during debounce', () => {
    mockConnectivity.mockReturnValue({ isOnline: false, pendingCount: 0 });

    const { rerender } = render(
      <OfflineGuard isOfflineAvailable={false}>
        <div>Page content</div>
      </OfflineGuard>,
    );

    // Halfway through debounce
    act(() => {
      vi.advanceTimersByTime(2_500);
    });

    // Go back online during debounce
    mockConnectivity.mockReturnValue({ isOnline: true, pendingCount: 0 });
    rerender(
      <OfflineGuard isOfflineAvailable={false}>
        <div>Page content</div>
      </OfflineGuard>,
    );

    // Advance past the original debounce time
    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    // Children should still be visible — the timer was cancelled
    expect(screen.getByText('Page content')).toBeInTheDocument();
    expect(screen.queryByText('Content unavailable offline')).not.toBeInTheDocument();
  });

  it('resets showUnavailable when guard conditions change', async () => {
    mockConnectivity.mockReturnValue({ isOnline: false, pendingCount: 0 });

    const { rerender } = render(
      <OfflineGuard isOfflineAvailable={false}>
        <div>Page content</div>
      </OfflineGuard>,
    );

    // Let the debounce elapse → unavailable shown
    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(screen.getByText('Content unavailable offline')).toBeInTheDocument();

    // Go back online — shouldGuard becomes false, triggers reset via queueMicrotask.
    // Fake timers don't flush microtasks, so we temporarily switch to real timers.
    mockConnectivity.mockReturnValue({ isOnline: true, pendingCount: 0 });

    await act(async () => {
      rerender(
        <OfflineGuard isOfflineAvailable={false}>
          <div>Page content</div>
        </OfflineGuard>,
      );
      // Flush the queueMicrotask by switching to real timers momentarily
      vi.useRealTimers();
      await new Promise<void>((r) => {
        queueMicrotask(r);
      });
      vi.useFakeTimers();
    });

    expect(screen.getByText('Page content')).toBeInTheDocument();
    expect(screen.queryByText('Content unavailable offline')).not.toBeInTheDocument();
  });
});

// ── Mode prop ──────────────────────────────────────────────────────

describe('OfflineGuard — mode prop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('passes "fullpage" mode by default', () => {
    mockConnectivity.mockReturnValue({ isOnline: false, pendingCount: 0 });

    render(
      <OfflineGuard isOfflineAvailable={false}>
        <div>Page content</div>
      </OfflineGuard>,
    );

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    // Fullpage mode renders an h2 heading
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('passes "banner" mode when specified', () => {
    mockConnectivity.mockReturnValue({ isOnline: false, pendingCount: 0 });

    render(
      <OfflineGuard isOfflineAvailable={false} mode="banner">
        <div>Page content</div>
      </OfflineGuard>,
    );

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    // Banner mode renders compact text (no h2 heading)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText(/not available offline/i)).toBeInTheDocument();
  });
});
