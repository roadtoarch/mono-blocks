/**
 * MonoBlocks — pages/DashboardPage/index.tsx
 *
 * Dashboard page: 4 clickable KPI tiles (KpiTileLink), recent work orders
 * table, quick links. Port of prototype dashboard.js.
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
} from '@carbon/react';
import { Link } from '@tanstack/react-router';

import { recentColumns, SKELETON_KPIS, SKELETON_ROWS } from './constants';

import { KpiTileLink } from '@/components/KpiTile';
import { LinkButton } from '@/components/LinkButton';
import { TableResource } from '@/components/TableResource';
import { useDashboard } from '@/hooks/useDashboard';

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
