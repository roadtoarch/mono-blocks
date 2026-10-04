/**
 * MonoBlocks — pages/DashboardPage/constants.tsx
 *
 * Static dashboard data: recent work-orders column defs and skeleton sizes.
 * Kept out of index.tsx so the page component reads as structure only.
 */
import { Tag } from '@carbon/react';
import { Link } from '@tanstack/react-router';

import type { TableResourceColumn } from '@/components/TableResource';
import type { RecentWorkOrder } from '@/hooks/useDashboard';

import { field, optionLabel, tagFamily } from '@/schema/helpers';
import { date } from '@/utils/format';

/** Column defs for the recent work-orders table, with links and status tags. */
export const recentColumns: TableResourceColumn<RecentWorkOrder>[] = [
  {
    key: 'title',
    header: 'Work order',
    render: (wo) => (
      <Link className="mb-table__entity-link" to="/work-orders/$id" params={{ id: wo.id }}>
        {wo.title}
      </Link>
    ),
  },
  {
    key: 'siteTitle',
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

/** Placeholder KPI tile count while the dashboard loads. */
export const SKELETON_KPIS = [0, 1, 2, 3] as const;

/** Placeholder table row count while the dashboard loads. */
export const SKELETON_ROWS = [0, 1, 2, 3, 4] as const;
