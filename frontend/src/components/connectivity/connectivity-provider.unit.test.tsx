/**
 * Unit tests for connectivity/connectivity-provider — context provider
 * that tracks `navigator.onLine` and outbox pending count.
 *
 * @module components/connectivity/connectivity-provider.unit.test
 */

import { act, render, screen } from '@testing-library/react';

// ── Mocks ──────────────────────────────────────────────────────────

vi.mock('@/db/outbox-adapter', () => ({
  outboxAdapter: { count: vi.fn(), failedCount: vi.fn() },
}));

vi.mock('@/offline/use-offline-allowed', () => ({
  useOfflineAllowed: vi.fn(),
}));

import { ConnectivityProvider } from './connectivity-provider';
import { useConnectivity } from './use-connectivity';

import { outboxAdapter } from '@/db/outbox-adapter';

const mockCount = vi.mocked(outboxAdapter.count);
const mockFailedCount = vi.mocked(outboxAdapter.failedCount);

// ── Helper: consumer component to read context ─────────────────────

const ContextReader = () => {
  const { isOnline, pendingCount, failedCount } = useConnectivity();
  return (
    <span>
      online={isOnline ? 'yes' : 'no'},pending={pendingCount},failed={failedCount}
    </span>
  );
};

// ── Setup / Teardown ───────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockCount.mockResolvedValue(0);
  mockFailedCount.mockResolvedValue(0);
});

// ── Provider state transitions ─────────────────────────────────────

describe('ConnectivityProvider — state transitions', () => {
  it('provides isOnline=true when navigator.onLine is true', () => {
    Object.defineProperty(globalThis.navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });

    render(
      <ConnectivityProvider>
        <ContextReader />
      </ConnectivityProvider>,
    );

    expect(screen.getByText(/online=yes/)).toBeInTheDocument();
  });

  it('provides isOnline=false when navigator.onLine is false', () => {
    Object.defineProperty(globalThis.navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });

    render(
      <ConnectivityProvider>
        <ContextReader />
      </ConnectivityProvider>,
    );

    expect(screen.getByText(/online=no/)).toBeInTheDocument();
  });

  it('updates isOnline when the "offline" event fires', () => {
    Object.defineProperty(globalThis.navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });

    render(
      <ConnectivityProvider>
        <ContextReader />
      </ConnectivityProvider>,
    );

    expect(screen.getByText(/online=yes/)).toBeInTheDocument();

    // Simulate going offline
    Object.defineProperty(globalThis.navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });

    act(() => {
      globalThis.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByText(/online=no/)).toBeInTheDocument();
  });

  it('updates isOnline when the "online" event fires', () => {
    Object.defineProperty(globalThis.navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });

    render(
      <ConnectivityProvider>
        <ContextReader />
      </ConnectivityProvider>,
    );

    expect(screen.getByText(/online=no/)).toBeInTheDocument();

    // Simulate going back online
    Object.defineProperty(globalThis.navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });

    act(() => {
      globalThis.dispatchEvent(new Event('online'));
    });

    expect(screen.getByText(/online=yes/)).toBeInTheDocument();
  });

  it('provides pendingCount from outboxAdapter on initial render', async () => {
    mockCount.mockResolvedValue(5);

    render(
      <ConnectivityProvider>
        <ContextReader />
      </ConnectivityProvider>,
    );

    // The initial fetch is via queueMicrotask, so we need to wait.
    await act(async () => {
      await new Promise((r) => {
        queueMicrotask(r);
      });
    });

    expect(screen.getByText(/pending=5/)).toBeInTheDocument();
  });

  it('updates pendingCount on polling interval', async () => {
    vi.useFakeTimers();

    mockCount.mockResolvedValue(0);

    render(
      <ConnectivityProvider>
        <ContextReader />
      </ConnectivityProvider>,
    );

    // Flush the initial microtask
    await act(async () => {
      await new Promise((r) => {
        queueMicrotask(r);
      });
    });

    expect(screen.getByText(/pending=0/)).toBeInTheDocument();

    // Update mock and advance timer
    mockCount.mockResolvedValue(3);

    await act(async () => {
      vi.advanceTimersByTime(2_000);
    });

    expect(screen.getByText(/pending=3/)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('handles outboxAdapter rejection gracefully', async () => {
    mockCount.mockRejectedValue(new Error('DB closing'));
    mockFailedCount.mockRejectedValue(new Error('DB closing'));

    render(
      <ConnectivityProvider>
        <ContextReader />
      </ConnectivityProvider>,
    );

    // Should not throw; pendingCount and failedCount stay at 0.
    await act(async () => {
      await new Promise((r) => {
        queueMicrotask(r);
      });
    });

    expect(screen.getByText(/pending=0,failed=0/)).toBeInTheDocument();
  });

  it('cleans up event listeners on unmount', () => {
    const addSpy = vi.spyOn(globalThis, 'addEventListener');
    const removeSpy = vi.spyOn(globalThis, 'removeEventListener');

    const { unmount } = render(
      <ConnectivityProvider>
        <ContextReader />
      </ConnectivityProvider>,
    );

    const onlineHandler = addSpy.mock.calls.find((c) => c[0] === 'online')?.[1];
    const offlineHandler = addSpy.mock.calls.find((c) => c[0] === 'offline')?.[1];

    expect(onlineHandler).toBeDefined();
    expect(offlineHandler).toBeDefined();

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('online', onlineHandler);
    expect(removeSpy).toHaveBeenCalledWith('offline', offlineHandler);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('clears the polling interval on unmount', () => {
    vi.useFakeTimers();

    const { unmount } = render(
      <ConnectivityProvider>
        <ContextReader />
      </ConnectivityProvider>,
    );

    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
    vi.useRealTimers();
  });
});

// ── useConnectivity guard ──────────────────────────────────────────

describe('useConnectivity — missing provider guard', () => {
  it('throws when used outside a ConnectivityProvider', () => {
    // Suppress console.error for expected throw
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<ContextReader />);
    }).toThrow('useConnectivity must be used within a <ConnectivityProvider>');

    consoleSpy.mockRestore();
  });
});
