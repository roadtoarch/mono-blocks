/**
 * Unit tests for offline/offline-unavailable — full-page and banner
 * "Content unavailable offline" messages.
 *
 * @module components/offline/offline-unavailable.unit.test
 */

import { render, screen } from '@testing-library/react';

import { OfflineUnavailable } from './offline-unavailable';

// ── Fullpage mode ──────────────────────────────────────────────────

describe('OfflineUnavailable — fullpage mode', () => {
  it('renders the heading "Content unavailable offline"', () => {
    render(<OfflineUnavailable />);

    expect(
      screen.getByRole('heading', { level: 2, name: /content unavailable offline/i }),
    ).toBeInTheDocument();
  });

  it('renders explanatory text about network requirement', () => {
    render(<OfflineUnavailable />);

    expect(screen.getByText(/requires a network connection/i)).toBeInTheDocument();
  });

  it('renders a Retry button', () => {
    render(<OfflineUnavailable />);

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('has role="status" for screen reader accessibility', () => {
    render(<OfflineUnavailable />);

    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toBeInTheDocument();
  });

  it('renders a Retry button', () => {
    render(<OfflineUnavailable />);

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});

// ── Banner mode ────────────────────────────────────────────────────

describe('OfflineUnavailable — banner mode', () => {
  it('renders compact "not available offline" text', () => {
    render(<OfflineUnavailable mode="banner" />);

    expect(screen.getByText(/this content is not available offline/i)).toBeInTheDocument();
  });

  it('has role="status" for screen reader accessibility', () => {
    render(<OfflineUnavailable mode="banner" />);

    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toBeInTheDocument();
  });

  it('does not render a heading in banner mode', () => {
    render(<OfflineUnavailable mode="banner" />);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('does not render a Retry button in banner mode', () => {
    render(<OfflineUnavailable mode="banner" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
