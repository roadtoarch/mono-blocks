/**
 * MonoBlocks — hooks/useEntityList.unit.test.ts
 *
 * Unit tests for the useEntityList and useRefCaches hooks.
 * Runs against the mock transport (the default outside the app entry point),
 * which mirrors the live Page<T> protocol.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import * as React from 'react';

import { useEntityList, useRefCaches } from './index';

import * as mockDb from '@/api/mockDb';

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
  it('fetches a Spring Page of seed data for customer', async () => {
    const { result } = renderHook(() => useEntityList('customer'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.content).toHaveLength(8);
    expect(result.current.data?.totalElements).toBe(8);
    expect(result.current.data?.content[0].entity_type).toBe('customer');
  });

  it('applies default sort from schema', async () => {
    const { result } = renderHook(() => useEntityList('customer'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const records = result.current.data?.content ?? [];
    // customer defaultSort = name asc
    const names = records.map((r) => r.name as string);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it('filters by server-side search query', async () => {
    const { result } = renderHook(() => useEntityList('customer', { search: 'Harborview' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const content = result.current.data?.content ?? [];
    expect(content.length).toBeGreaterThanOrEqual(1);
    expect(content.every((r) => (r.name as string).toLowerCase().includes('harborview'))).toBe(
      true,
    );
  });

  it('filters by status', async () => {
    const { result } = renderHook(() => useEntityList('customer', { status: 'active' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.content.every((r) => r.status === 'active')).toBe(true);
  });

  it('sorts by specified field descending', async () => {
    const { result } = renderHook(
      () => useEntityList('customer', { sort: { key: 'name', dir: 'desc' } }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const records = result.current.data?.content ?? [];
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

    // The ref-type key must exist even before its query resolves, so table
    // cells resolving a foreign key never dereference a missing cache map.
    expect(result.current).toHaveProperty('customer');

    await waitFor(() => {
      expect(Object.keys(result.current.customer).length).toBeGreaterThan(0);
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
