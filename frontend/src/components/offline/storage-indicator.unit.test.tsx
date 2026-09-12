/**
 * Unit tests for offline/storage-indicator — progress bar showing
 * offline storage usage vs quota polled from navigator.storage.estimate().
 *
 * @module components/offline/storage-indicator.unit.test
 */

import { act, render, screen } from '@testing-library/react';

import { StorageIndicator } from './storage-indicator';

// ── Mocks ──────────────────────────────────────────────────────────

const mockEstimate = vi.fn<() => Promise<{ quota: number; usage: number }>>();

beforeEach(() => {
  vi.clearAllMocks();

  // Default: unavailable (quota 0)
  mockEstimate.mockResolvedValue({ quota: 0, usage: 0 });

  Object.defineProperty(navigator, 'storage', {
    value: { estimate: mockEstimate },
    writable: true,
    configurable: true,
  });
});

// ── Returns null when quota is 0 ───────────────────────────────────

describe('StorageIndicator — null rendering', () => {
  it('returns null when navigator.storage.estimate returns quota: 0', async () => {
    mockEstimate.mockResolvedValue({ quota: 0, usage: 0 });

    const { container } = render(<StorageIndicator />);

    // Flush the initial useEffect fetch
    await act(() => mockEstimate.mock.resolvedValue);

    expect(container.innerHTML).toBe('');
  });

  it('handles Storage API rejection gracefully', async () => {
    mockEstimate.mockRejectedValue(new Error('Storage API not available'));

    const { container } = render(<StorageIndicator />);

    // Flush the rejected promise
    await act(async () => {
      // Allow the promise rejection to settle
    });

    expect(container.innerHTML).toBe('');
  });
});

// ── Progress bar and usage text ────────────────────────────────────

describe('StorageIndicator — progress bar display', () => {
  it('shows progress bar and usage text when estimate is available', async () => {
    mockEstimate.mockResolvedValue({ quota: 1_073_741_824, usage: 536_870_912 });

    render(<StorageIndicator />);

    await act(async () => {
      // Allow the initial fetch to settle
    });

    // Should show usage text with formatted bytes
    expect(screen.getByText(/offline storage:/i)).toBeInTheDocument();
    // 512 MiB / 1.0 GiB
    expect(screen.getByText(/512\.0 MiB/i)).toBeInTheDocument();
    expect(screen.getByText(/1\.0 GiB/i)).toBeInTheDocument();
  });
});

// ── Status labels ──────────────────────────────────────────────────

describe('StorageIndicator — status labels', () => {
  it('displays "Normal" status label when usage < 80%', async () => {
    // 50% usage
    mockEstimate.mockResolvedValue({ quota: 1_000_000_000, usage: 500_000_000 });

    render(<StorageIndicator />);

    await act(async () => {});

    expect(screen.getByText(/Normal/)).toBeInTheDocument();
  });

  it('displays "Warning" status label when usage ≥ 80%', async () => {
    // 85% usage
    mockEstimate.mockResolvedValue({ quota: 1_000_000_000, usage: 850_000_000 });

    render(<StorageIndicator />);

    await act(async () => {});

    expect(screen.getByText(/Warning/)).toBeInTheDocument();
  });

  it('displays "Critical" status label when usage ≥ 90%', async () => {
    // 95% usage
    mockEstimate.mockResolvedValue({ quota: 1_000_000_000, usage: 950_000_000 });

    render(<StorageIndicator />);

    await act(async () => {});

    expect(screen.getByText(/Critical/)).toBeInTheDocument();
  });
});

// ── Polling cleanup ────────────────────────────────────────────────

describe('StorageIndicator — polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cleans up polling interval on unmount', async () => {
    mockEstimate.mockResolvedValue({ quota: 1_000_000_000, usage: 500_000_000 });

    const { unmount } = render(<StorageIndicator />);

    await act(async () => {});

    const callCountAfterMount = mockEstimate.mock.calls.length;

    // Advance past one poll interval
    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(mockEstimate.mock.calls.length).toBeGreaterThan(callCountAfterMount);

    unmount();

    const callCountAfterUnmount = mockEstimate.mock.calls.length;

    // Advance past another poll interval
    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    // No new calls after unmount
    expect(mockEstimate.mock.calls.length).toBe(callCountAfterUnmount);
  });
});
