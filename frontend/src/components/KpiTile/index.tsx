/**
 * MonoBlocks — components/KpiTile/index.tsx
 *
 * Clickable KPI tile (caption + value + delta) for the dashboard grid.
 * Port of prototype dashboard.js.
 *
 * WCAG 2.5.3 Label in Name: the tile's aria-label reproduces the exact
 * concatenation of visible text (caption + ":" + value + delta) plus
 * "View list." so screen readers announce a natural sentence and axe's
 * label-content-name-mismatch rule passes.
 */
import { Link } from '@tanstack/react-router';

import type { KpiDelta, KpiTile } from '@/hooks/useDashboard';

import { number as fmtNum } from '@/utils/format';

interface DeltaProps {
  /** Delta line below the tile value; trend drives the arrow modifier. */
  readonly delta: KpiDelta;
}

/**
 * Build the accessible name for a KPI tile.
 * Reproduces the exact visible text concatenation (no separator) for
 * axe 4.12 label-content-name-mismatch compliance.
 * Screen readers pause on ":" and "(", so the spoken result is the
 * natural sentence: "Total customers: 8 (No new contracts this quarter). View list."
 */
const kpiLabel = (kpi: KpiTile): string => {
  let label = `${kpi.caption}:${fmtNum(kpi.value)}`;
  if (kpi.delta.text) {
    label += `(${kpi.delta.text})`;
  }
  return `${label}. View list.`;
};

const Delta = ({ delta }: DeltaProps) => {
  if (!delta.trend) return <span className="mb-tile__delta">({delta.text})</span>;

  const mod = delta.trend === 'up' ? ' mb-tile__delta--up' : ' mb-tile__delta--down';
  return (
    <span className={`mb-tile__delta${mod}`}>
      (<span className="mb-tile__delta-icon">{delta.trend === 'up' ? '↑' : '↓'}</span> {delta.text})
    </span>
  );
};

export interface KpiTileLinkProps {
  /** KPI data rendered by the tile and used to build its accessible name. */
  readonly kpi: KpiTile;
}

export const KpiTileLink = ({ kpi }: KpiTileLinkProps) => {
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
};
