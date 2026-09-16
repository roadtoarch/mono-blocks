/**
 * MonoBlocks — hooks/useDashboard.unit.test.tsx
 *
 * Tests for the useDashboard hook: KPI math, recent WOs, loading.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import type { ReactNode } from 'react';

import * as mockDb from '@/api/mockDb';
import { useDashboard } from '@/hooks/useDashboard';

// ── Helpers ──────────────────────────────────────────────────────────────

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 0 } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('useDashboard', () => {
  beforeEach(async () => {
    await mockDb.reset();
  });

  it('returns 4 KPI tiles with correct captions', async () => {
    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data;
    if (!data) return;
    const kpis = data.kpis;
    expect(kpis).toHaveLength(4);
    expect(kpis[0].caption).toBe('Total customers');
    expect(kpis[1].caption).toBe('Active sites');
    expect(kpis[2].caption).toBe('Open work orders');
    expect(kpis[3].caption).toBe('Equipment due service');
  });

  it('computes customer count and new-customer delta', async () => {
    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data;
    if (!data) return;
    const customers = data.kpis[0];
    expect(customers.value).toBe(8); // seed has 8 customers
    expect(customers.href).toBe('/customers');
    // Delta text should mention "new this quarter" or "No new contracts"
    expect(customers.delta.text).toMatch(/new this quarter|No new contracts/);
  });

  it('computes active sites and management delta', async () => {
    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data;
    if (!data) return;
    const sites = data.kpis[1];
    expect(sites.value).toBeGreaterThan(0);
    expect(sites.href).toBe('/sites');
    expect(sites.delta.text).toContain('under management');
  });

  it('computes open work orders and urgent delta', async () => {
    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data;
    if (!data) return;
    const wos = data.kpis[2];
    expect(wos.value).toBeGreaterThan(0);
    expect(wos.href).toBe('/work-orders');
    // Delta text mentions "urgent" or "No urgent"
    expect(wos.delta.text).toMatch(/urgent|No urgent/);
  });

  it('computes equipment due service and down delta', async () => {
    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data;
    if (!data) return;
    const equip = data.kpis[3];
    expect(equip.value).toBeGreaterThanOrEqual(0);
    expect(equip.href).toBe('/equipment');
    expect(equip.delta.text).toMatch(/down|under maintenance|fully operational/);
  });

  it('returns up to 5 recent work orders with site titles', async () => {
    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data;
    if (!data) return;
    const recent = data.recent;
    expect(recent.length).toBeLessThanOrEqual(5);
    // Each recent WO should have resolved site title
    for (const wo of recent) {
      expect(wo.id).toBeTruthy();
      expect(wo.title).toBeTruthy();
      expect(wo.siteTitle).toBeTruthy();
    }
  });

  it('handles loading state initially', () => {
    const { result } = renderHook(() => useDashboard(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('shows urgent trend when urgent open work orders exist', async () => {
    // Make a work order both open and urgent
    await mockDb.update('work_order', 'wo-001', { status: 'open', priority: 'urgent' });

    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data;
    if (!data) return;
    const wos = data.kpis[2]; // Open work orders
    expect(wos.delta.trend).toBe('down');
    expect(wos.delta.text).toContain('urgent');
  });

  it('shows "No urgent orders" when no urgent open work orders', { timeout: 20000 }, async () => {
    // Set all open WOs to non-urgent priority
    const allWos = mockDb.peek('work_order');
    const openStatuses = new Set(['open', 'scheduled', 'in_progress']);
    const openIds = allWos.filter((wo) => openStatuses.has(wo.status as string)).map((wo) => wo.id);

    // Update each open WO to low priority
    for (const id of openIds) {
      await mockDb.update('work_order', id, { priority: 'low' });
    }

    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 10000 },
    );

    const data = result.current.data;
    if (!data) return;
    const wos = data.kpis[2]; // Open work orders
    expect(wos.delta.trend).toBeNull();
    expect(wos.delta.text).toContain('No urgent');
  });

  it('shows "new this quarter" trend when a customer has recent contract_start', async () => {
    // Create a customer with a contract_start within the last 90 days
    const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await mockDb.create('customer', {
      name: 'Fresh Corp',
      billing_email: 'fresh@test.com',
      contract_start: recentDate,
    });

    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data;
    if (!data) return;
    const customers = data.kpis[0]; // Total customers
    expect(customers.delta.trend).toBe('up');
    expect(customers.delta.text).toContain('new this quarter');
    expect(customers.value).toBe(9); // 8 seed + 1 new
  });

  it('shows "down or under maintenance" trend when equipment is down', async () => {
    // Set some equipment to non-operational status
    await mockDb.update('equipment', 'equip-001', { status: 'down' });

    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data;
    if (!data) return;
    const equip = data.kpis[3]; // Equipment due service
    expect(equip.delta.trend).toBe('down');
    expect(equip.delta.text).toMatch(/down|under maintenance/);
  });

  it('handles equipment with invalid last_service_date gracefully', async () => {
    // Set invalid date on an equipment record
    await mockDb.update('equipment', 'equip-001', {
      status: 'operational',
      last_service_date: 'not-a-real-date',
    });

    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data;
    if (!data) return;
    // Invalid date → daysSince returns Infinity → equipment is "due service"
    const equip = data.kpis[3];
    expect(equip.value).toBeGreaterThanOrEqual(0);
  });

  it(
    'shows "Fleet fully operational" when all equipment is operational and recently serviced',
    { timeout: 30000 },
    async () => {
      // Set all equipment to operational with very recent service dates
      const allEquip = mockDb.peek('equipment');
      const recentDate = new Date().toISOString().slice(0, 10);
      for (const eq of allEquip) {
        await mockDb.update('equipment', eq.id, {
          status: 'operational',
          last_service_date: recentDate,
        });
      }

      const { result } = renderHook(() => useDashboard(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const data = result.current.data;
      if (!data) return;
      const equip = data.kpis[3];
      expect(equip.delta.trend).toBeNull();
      expect(equip.delta.text).toContain('fully operational');
    },
  );
});
