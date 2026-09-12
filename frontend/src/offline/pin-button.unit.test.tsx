/**
 * Unit tests for offline/pin-button — Pin/unpin toggle button component.
 *
 * @module offline/pin-button.unit.test
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mocks are hoisted by Vitest — must appear before the mocked imports.
vi.mock('./use-offline-allowed', () => ({
  useOfflineAllowed: vi.fn(),
}));
vi.mock('./use-record-pin', () => ({
  useRecordPin: vi.fn(),
}));
vi.mock('./use-storage-budget', () => ({
  useStorageBudget: vi.fn(),
}));

import { PinButton } from './pin-button';
import { useOfflineAllowed } from './use-offline-allowed';
import { useRecordPin } from './use-record-pin';
import { useStorageBudget } from './use-storage-budget';

const mockOfflineAllowed = vi.mocked(useOfflineAllowed);
const mockRecordPin = vi.mocked(useRecordPin);
const mockStorageBudget = vi.mocked(useStorageBudget);

// ── Default mock returns ───────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  mockOfflineAllowed.mockReturnValue(true);
  mockStorageBudget.mockReturnValue({ canPin: true, isWarning: false, usagePercent: 0 });
  mockRecordPin.mockReturnValue({
    isPinned: false,
    toggle: vi.fn().mockResolvedValue(undefined),
  });
});

// ── Rendering ──────────────────────────────────────────────────────

describe('PinButton — rendering', () => {
  it('renders the pin button when offline features are allowed', () => {
    mockOfflineAllowed.mockReturnValue(true);

    render(<PinButton contentType="user" contentId="42" userId="u1" />);

    expect(screen.getByRole('button', { name: /pin for offline/i })).toBeInTheDocument();
  });

  it('returns null when offline features are NOT allowed', () => {
    mockOfflineAllowed.mockReturnValue(false);

    const { container } = render(<PinButton contentType="user" contentId="42" userId="u1" />);

    expect(container.innerHTML).toBe('');
  });

  it('shows "Unpin from offline" label when pinned', () => {
    mockRecordPin.mockReturnValue({
      isPinned: true,
      toggle: vi.fn().mockResolvedValue(undefined),
    });

    render(<PinButton contentType="user" contentId="42" userId="u1" />);

    expect(screen.getByRole('button', { name: /unpin from offline/i })).toBeInTheDocument();
  });

  it('uses a custom label when provided', () => {
    render(<PinButton contentType="user" contentId="42" userId="u1" label="Save offline" />);

    expect(screen.getByRole('button', { name: /save offline/i })).toBeInTheDocument();
  });
});

// ── Interaction ────────────────────────────────────────────────────

describe('PinButton — interaction', () => {
  it('calls toggle on click', async () => {
    const toggle = vi.fn().mockResolvedValue(undefined);
    mockRecordPin.mockReturnValue({ isPinned: false, toggle });

    render(<PinButton contentType="user" contentId="42" userId="u1" />);
    await userEvent.click(screen.getByRole('button'));

    expect(toggle).toHaveBeenCalledOnce();
  });
});

// ── Props forwarding ───────────────────────────────────────────────

describe('PinButton — props', () => {
  it('passes contentType, contentId, userId, and canPin to useRecordPin', () => {
    render(<PinButton contentType="order" contentId="99" userId="u2" />);

    expect(mockRecordPin).toHaveBeenCalledWith({
      contentType: 'order',
      contentId: '99',
      userId: 'u2',
      canPin: true,
    });
  });
});
