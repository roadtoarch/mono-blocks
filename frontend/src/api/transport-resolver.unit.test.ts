/**
 * MonoBlocks — api/transport-resolver.unit.test.ts
 *
 * Unit tests for the API transport resolver.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { Transport } from '@/http/types';

import { getTransport, resetTransport, setTransport } from './transport-resolver.ts';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('transport-resolver', () => {
  beforeEach(() => {
    resetTransport();
  });

  it('returns mock transport by default', () => {
    const t = getTransport();
    expect(t).toBeDefined();
    expect(typeof t).toBe('function');
  });

  it('returns the same transport on repeated calls', () => {
    const t1 = getTransport();
    const t2 = getTransport();
    expect(t1).toBe(t2);
  });

  it('allows setting a custom transport', () => {
    const custom: Transport = vi.fn();
    setTransport(custom);
    expect(getTransport()).toBe(custom);
  });

  it('resetTransport restores the mock transport', () => {
    const original = getTransport();
    const custom: Transport = vi.fn();
    setTransport(custom);
    expect(getTransport()).toBe(custom);

    resetTransport();
    const afterReset = getTransport();
    expect(afterReset).toBe(original);
  });
});
