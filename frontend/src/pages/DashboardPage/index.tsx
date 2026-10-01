/**
 * MonoBlocks — components/DashboardPage.tsx
 *
 * Dashboard page: 4 clickable KPI tiles, recent work orders table, quick links.
 * Port of prototype dashboard.js.
 *
 * WCAG 2.5.3 Label in Name: each KPI tile's aria-label reproduces the exact
 * concatenation of visible text (caption + ":" + value + delta) plus
 * "View list." so screen readers announce a natural sentence and axe's
 * label-content-name-mismatch rule passes.
 */
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { Link } from '@tanstack/react-router';

import type { TableResourceColumn } from '@/components/TableResource';
import type { KpiDelta, KpiTile, RecentWorkOrder } from '@/hooks/useDashboard';

import { LinkButton } from '@/components/LinkButton';
import { TableResource } from '@/components/TableResource';
import { useDashboard } from '@/hooks/useDashboard';
import { field, optionLabel, tagFamily } from '@/schema/helpers';
import { date, number as fmtNum } from '@/utils/format';

// ── KPI tile ─────────────────────────────────────────────────────────────

/**
 * Build the accessible name for a KPI tile.
 * Reproduces the exact visible text concatenation (no separator) for
 * axe 4.12 label-content-name-mismatch compliance.
 * Screen readers pause on ":" and "(", so the spoken result is the
 * natural sentence: "Total customers: 8 (No new contracts this quarter). View list."
 */
function kpiLabel(kpi: KpiTile): string {
  let label = `${kpi.caption}:${fmtNum(kpi.value)}`;
  if (kpi.delta.text) {
    label += `(${kpi.delta.text})`;
  }
  return `${label}. View list.`;
}

function Delta({ delta }: { delta: KpiDelta }) {
  if (!delta.trend) return <span className="mb-tile__delta">({delta.text})</span>;

  const mod = delta.trend === 'up' ? ' mb-tile__delta--up' : ' mb-tile__delta--down';
  return (
    <span className={`mb-tile__delta${mod}`}>
      (<span className="mb-tile__delta-icon">{delta.trend === 'up' ? '↑' : '↓'}</span> {delta.text})
    </span>
  );
}

function KpiTileLink({ kpi }: { kpi: KpiTile }) {
  return (
    <Link to={kpi.href} className="mb-tile mb-tile--clickable" aria-label={kpiLabel(kpi)}>
      <div>
        <p className="mb-tile__caption">{kpi.caption}:</p>
        <p className="mb-tile__value cds--tabular-nums">{fmtNum(kpi.value)}</p>
        <Delta delta={kpi.delta} />
      </div>
      <span aria-hidden="true" className="mb-tile__chevron">
        ›
      </span>
    </Link>
  );
}

// ── Recent work orders table ─────────────────────────────────────────────

const recentColumns: TableResourceColumn<RecentWorkOrder>[] = [
  {
    key: 'workOrder',
    header: 'Work order',
    render: (wo) => (
      <Link className="mb-table__entity-link" to="/work-orders/$id" params={{ id: wo.id }}>
        {wo.title}
      </Link>
    ),
  },
  {
    key: 'site',
    header: 'Site',
    render: (wo) => wo.siteTitle,
  },
  {
    key: 'priority',
    header: 'Priority',
    render: (wo) => {
      const prioField = field('work_order', 'priority');
      const prioColor = tagFamily('work_order', 'priority', wo.priority);
      return prioColor ? <Tag type={prioColor}>{optionLabel(prioField, wo.priority)}</Tag> : null;
    },
  },
  {
    key: 'status',
    header: 'Status',
    render: (wo) => {
      const statusField = field('work_order', 'status');
      const statusColor = tagFamily('work_order', 'status', wo.status);
      return statusColor ? (
        <Tag type={statusColor}>{optionLabel(statusField, wo.status)}</Tag>
      ) : null;
    },
  },
  {
    key: 'scheduledFor',
    header: 'Scheduled for',
    render: (wo) => date(wo.scheduledFor),
    className: 'cds--mono',
  },
];

// ── Skeleton ─────────────────────────────────────────────────────────────

const SKELETON_KPIS = [0, 1, 2, 3] as const;
const SKELETON_ROWS = [0, 1, 2, 3, 4] as const;

function DashboardSkeleton() {
  return (
    <>
      <div className="mb-kpi-grid">
        {SKELETON_KPIS.map((i) => (
          <div key={i} className="mb-tile mb-skeleton" aria-hidden="true">
            <div className="mb-skeleton__line mb-skeleton__line--short" />
            <div className="mb-skeleton__line mb-skeleton__line--heading" />
            <div className="mb-skeleton__line mb-skeleton__line--short" />
          </div>
        ))}
      </div>
      <section className="mb-section" aria-label="Recent work orders">
        <h2 className="mb-section__title">Recent work orders</h2>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Work order</TableHeader>
                <TableHeader>Site</TableHeader>
                <TableHeader>Priority</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Scheduled for</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {SKELETON_ROWS.map((i) => (
                <TableRow key={i}>
                  {SKELETON_ROWS.slice(0, 5).map((j) => (
                    <TableCell key={j}>
                      <div className="mb-skeleton__line" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </section>
    </>
  );
}

// ── Error state ──────────────────────────────────────────────────────────

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="mb-error-state">
      <h1 className="mb-error-state__title">Couldn't load the dashboard</h1>
      <p className="mb-error-state__text">{error.message || 'Something went wrong.'}</p>
      <Button kind="secondary" type="button" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────

/**
 * Dashboard page — KPI tiles, recent work orders, quick links.
 * Fetches data via useDashboard hook (TanStack Query).
 */
export const DashboardPage = () => {
  const { data, isLoading, isError, error, refetch } = useDashboard();
  if (isError) {
    const err = error instanceof Error ? error : new Error('Something went wrong.');
    return <DashboardError error={err} onRetry={() => void refetch()} />;
  }
  return (
    <>
      <div className="mb-page-header">
        <h1 className="mb-page-header__title">Dashboard</h1>
      </div>

      {isLoading || !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="mb-kpi-grid">
            {data.kpis.map((kpi) => (
              <KpiTileLink key={kpi.caption} kpi={kpi} />
            ))}
          </div>

          <section className="mb-section" aria-label="Recent work orders">
            <h2 className="mb-section__title">Recent work orders</h2>
            <TableResource
              columns={recentColumns}
              data={data.recent}
              keyExtractor={(wo) => wo.id}
            />
            <p>
              <Link to="/work-orders" className="mb-btn mb-btn--ghost">
                View all work orders
              </Link>
            </p>
          </section>

          <section className="mb-section" aria-label="Quick links">
            <h2 className="mb-section__title">Quick links</h2>
            <div className="mb-page-header__actions">
              <LinkButton kind="primary" to="/work-orders/new">
                Add work order
              </LinkButton>
              <LinkButton kind="secondary" to="/customers/new">
                Add customer
              </LinkButton>
              <LinkButton kind="secondary" to="/sites/new">
                Add site
              </LinkButton>
            </div>
          </section>
        </>
      )}
    </>
  );
};
