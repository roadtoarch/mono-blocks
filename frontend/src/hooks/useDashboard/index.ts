/**
 * MonoBlocks — hooks/useDashboard.ts
 *
 * TanStack Query hook for the dashboard. Computes 4 KPI tiles and
 * recent work orders from the 5 entity list endpoints.
 * Port of prototype dashboard.js KPI math.
 */
import { useQuery } from '@tanstack/react-query';

import { getEntityResource } from '@/api/resources/entity-resource-factory';
import { titleOf } from '@/schema/helpers';

// ── Constants ────────────────────────────────────────────────────────────

/** Equipment with last_service_date older than this many days → "due service". */
const DUE_SERVICE_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

// ── KPI math ─────────────────────────────────────────────────────────────

function daysSince(isoDate: unknown): number {
  if (!isoDate || typeof isoDate !== 'string') return Infinity;
  const d = new Date(isoDate.slice(0, 10) + 'T00:00:00Z');
  if (isNaN(d.getTime())) return Infinity;
  return (Date.now() - d.getTime()) / DAY_MS;
}

// ── Types ────────────────────────────────────────────────────────────────

export interface KpiDelta {
  trend: 'up' | 'down' | null;
  text: string;
}

export interface KpiTile {
  caption: string;
  value: number;
  delta: KpiDelta;
  href: string;
}

export interface RecentWorkOrder {
  id: string;
  title: string;
  siteId: string;
  siteTitle: string;
  priority: string;
  status: string;
  scheduledFor: string;
}

export interface DashboardData {
  kpis: KpiTile[];
  recent: RecentWorkOrder[];
}

// ── Hook ─────────────────────────────────────────────────────────────────

/**
 * Fetch all 5 entity lists and compute dashboard data (KPIs + recent WOs).
 * Single query key so the dashboard re-renders atomically.
 */
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async (): Promise<DashboardData> => {
      const [customers, sites, equipment, , workOrders] = await Promise.all([
        getEntityResource('customer').list({}),
        getEntityResource('site').list({}),
        getEntityResource('equipment').list({}),
        getEntityResource('technician').list({}),
        getEntityResource('work_order').list({ sort: { key: 'scheduled_for', dir: 'desc' } }),
      ]);

      // Ref cache for site titles (used in recent WOs table)
      const siteTitles: Record<string, string> = {};
      for (const s of sites) {
        siteTitles[s.id] = titleOf('site', s);
      }

      // ── KPI 1: Total customers ────────────────────────────────────────
      const newCustomers = customers.filter((c) => {
        const d = daysSince(c.contract_start);
        return d >= 0 && d <= 90;
      }).length;

      // ── KPI 2: Active sites ───────────────────────────────────────────
      const activeSites = sites.filter((s) => s.status === 'active').length;

      // ── KPI 3: Open work orders ──────────────────────────────────────
      const openStatuses = new Set(['open', 'scheduled', 'in_progress']);
      const openOrders = workOrders.filter((w) => openStatuses.has(w.status as string));
      const urgentOpen = openOrders.filter((w) => w.priority === 'urgent').length;

      // ── KPI 4: Equipment due service ─────────────────────────────────
      const dueEquipment = equipment.filter(
        (e) => e.status !== 'operational' || daysSince(e.last_service_date) > DUE_SERVICE_DAYS,
      ).length;
      const downEquipment = equipment.filter((e) => e.status !== 'operational').length;

      // ── Build KPIs ───────────────────────────────────────────────────
      const kpis: KpiTile[] = [
        {
          caption: 'Total customers',
          value: customers.length,
          href: '/customers',
          delta:
            newCustomers > 0
              ? { trend: 'up', text: `${String(newCustomers)} new this quarter` }
              : { trend: null, text: 'No new contracts this quarter' },
        },
        {
          caption: 'Active sites',
          value: activeSites,
          href: '/sites',
          delta: {
            trend: null,
            text: `${String(activeSites)} of ${String(sites.length)} under management`,
          },
        },
        {
          caption: 'Open work orders',
          value: openOrders.length,
          href: '/work-orders',
          delta:
            urgentOpen > 0
              ? { trend: 'down', text: `${String(urgentOpen)} urgent need attention` }
              : { trend: null, text: 'No urgent orders right now' },
        },
        {
          caption: 'Equipment due service',
          value: dueEquipment,
          href: '/equipment',
          delta:
            downEquipment > 0
              ? { trend: 'down', text: `${String(downEquipment)} down or under maintenance` }
              : { trend: null, text: 'Fleet fully operational' },
        },
      ];

      // ── Recent work orders (top 5) ──────────────────────────────────
      const recent: RecentWorkOrder[] = workOrders.slice(0, 5).map((wo) => ({
        id: wo.id,
        title: (wo.title as string) || wo.id,
        siteId: (wo.site_id as string) || '',
        siteTitle: siteTitles[(wo.site_id as string) || ''] || '—',
        priority: (wo.priority as string) || '',
        status: (wo.status as string) || '',
        scheduledFor: (wo.scheduled_for as string) || '',
      }));

      return { kpis, recent };
    },
  });
}
