/**
 * MonoBlocks — hooks/useEntityList.unit.test.ts
 *
 * Unit tests for the useEntityList and useRefCaches hooks.
 * Uses @testing-library/react with real timers (mockDb latency is real).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import * as React from 'react';

import * as mockDb from '@/api/mockDb';
import { useEntityList, useRefCaches } from './index';

// ── Helpers ───────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────

beforeEach(async () => {
  // Reset mockDb to seed state — use real async since mockDb uses real timers
  await mockDb.reset();
});

// ── useEntityList ─────────────────────────────────────────────────────────

describe('useEntityList', () => {
  it('fetches seed data for customer', async () => {
    const { result } = renderHook(() => useEntityList('customer'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(8);
    expect(result.current.data?.[0].entity_type).toBe('customer');
  });

  it('applies default sort from schema', async () => {
    const { result } = renderHook(() => useEntityList('customer'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const records = result.current.data ?? [];
    // customer defaultSort = name asc
    const names = records.map((r) => r.name as string);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it('filters by search query', async () => {
    const { result } = renderHook(() => useEntityList('customer', { q: 'Harborview' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.length).toBeGreaterThanOrEqual(1);
    expect(
      result.current.data?.every((r) => (r.name as string).toLowerCase().includes('harborview')),
    ).toBe(true);
  });

  it('filters by filter values', async () => {
    const { result } = renderHook(
      () => useEntityList('customer', { filters: { tier: 'premium' } }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.every((r) => r.tier === 'premium')).toBe(true);
  });

  it('sorts by specified field descending', async () => {
    const { result } = renderHook(
      () => useEntityList('customer', { sort: { key: 'name', dir: 'desc' } }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const records = result.current.data ?? [];
    const names = records.map((r) => r.name as string);
    const sorted = [...names].sort((a, b) => b.localeCompare(a));
    expect(names).toEqual(sorted);
  });

  it('returns error when failNext is set', async () => {
    mockDb.setFailNext(true);

    const { result } = renderHook(() => useEntityList('customer'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.name).toBe('NetworkError');
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(() => useEntityList('customer'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
});

// ── useRefCaches ──────────────────────────────────────────────────────────

describe('useRefCaches', () => {
  it('resolves customer ref for site entity', async () => {
    const { result } = renderHook(() => useRefCaches('site'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(Object.keys(result.current)).toContain('customer');
    });

    const customerCache = result.current.customer;
    expect(Object.keys(customerCache).length).toBeGreaterThan(0);
    for (const title of Object.values(customerCache)) {
      expect(typeof title).toBe('string');
      expect(title.length).toBeGreaterThan(0);
    }
  });

  it('returns empty object for entity with no refs', async () => {
    const { result } = renderHook(() => useRefCaches('customer'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toEqual({});
    });
  });

  it('resolves site and technician refs for work_order', async () => {
    const { result } = renderHook(() => useRefCaches('work_order'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(Object.keys(result.current)).toContain('technician');
      expect(Object.keys(result.current)).toContain('site');
    });
  });
});
