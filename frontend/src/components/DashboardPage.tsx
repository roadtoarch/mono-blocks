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
import { Link } from '@tanstack/react-router';

import type { KpiDelta, KpiTile, RecentWorkOrder } from '@/hooks/useDashboard';

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
      ({delta.trend === 'up' ? '↑' : '↓'} {delta.text})
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

function RecentRow({ wo }: { wo: RecentWorkOrder }) {
  const statusField = field('work_order', 'status');
  const prioField = field('work_order', 'priority');
  const statusColor = tagFamily('work_order', 'status', wo.status);
  const prioColor = tagFamily('work_order', 'priority', wo.priority);

  return (
    <tr>
      <td>
        <Link className="mb-table__entity-link" to="/work-orders/$id" params={{ id: wo.id }}>
          {wo.title}
        </Link>
      </td>
      <td>{wo.siteTitle}</td>
      <td>
        {prioColor && (
          <span className={`mb-tag mb-tag--${prioColor}`}>
            {optionLabel(prioField, wo.priority)}
          </span>
        )}
      </td>
      <td>
        {statusColor && (
          <span className={`mb-tag mb-tag--${statusColor}`}>
            {optionLabel(statusField, wo.status)}
          </span>
        )}
      </td>
      <td className="cds--mono">{date(wo.scheduledFor)}</td>
    </tr>
  );
}

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
        <div className="mb-table-wrapper">
          <table className="mb-table">
            <thead>
              <tr>
                <th scope="col">Work order</th>
                <th scope="col">Site</th>
                <th scope="col">Priority</th>
                <th scope="col">Status</th>
                <th scope="col">Scheduled for</th>
              </tr>
            </thead>
            <tbody>
              {SKELETON_ROWS.map((i) => (
                <tr key={i}>
                  {SKELETON_ROWS.slice(0, 5).map((j) => (
                    <td key={j}>
                      <div className="mb-skeleton__line" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
      <button className="mb-btn mb-btn--secondary" type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────

/**
 * Dashboard page — KPI tiles, recent work orders, quick links.
 * Fetches data via useDashboard hook (TanStack Query).
 */
export function DashboardPage() {
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
            <div className="mb-table-wrapper">
              <table className="mb-table">
                <thead>
                  <tr>
                    <th scope="col">Work order</th>
                    <th scope="col">Site</th>
                    <th scope="col">Priority</th>
                    <th scope="col">Status</th>
                    <th scope="col">Scheduled for</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((wo) => (
                    <RecentRow key={wo.id} wo={wo} />
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              <Link className="mb-btn mb-btn--ghost" to="/work-orders">
                View all work orders
              </Link>
            </p>
          </section>

          <section className="mb-section" aria-label="Quick links">
            <h2 className="mb-section__title">Quick links</h2>
            <div className="mb-page-header__actions">
              <Link className="mb-btn mb-btn--primary" to="/work-orders/new">
                Add work order
              </Link>
              <Link className="mb-btn mb-btn--secondary" to="/customers/new">
                Add customer
              </Link>
              <Link className="mb-btn mb-btn--secondary" to="/sites/new">
                Add site
              </Link>
            </div>
          </section>
        </>
      )}
    </>
  );
}
