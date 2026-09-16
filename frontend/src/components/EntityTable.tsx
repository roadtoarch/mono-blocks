/**
 * MonoBlocks — components/EntityTable.tsx
 *
 * Schema-driven data table for entity list pages.
 * Features: sortable column headers (aria-sort), entity link in first column,
 * tags for tagged fields, date/numeric/mono formatting, row click navigation,
 * row action buttons (edit/delete ghost buttons), and skeleton loading state.
 */
import { Edit, TrashCan } from '@carbon/icons-react';
import { Link } from '@tanstack/react-router';

import type {
  EntityConfig,
  EntityRecord,
  EntityType,
  FieldDef,
  SortDef,
  TagColor,
} from '@/schema/types';

import { optionLabel, tagFamily, titleOf } from '@/schema/api';
import { date as fmtDate, number as fmtNumber } from '@/utils/format';

// ── Types ─────────────────────────────────────────────────────────────────

export interface EntityTableProps {
  type: EntityType;
  schema: EntityConfig;
  records: EntityRecord[];
  refCaches: Record<string, Record<string, string>>;
  sort: SortDef;
  onSort: (sort: SortDef) => void;
}

// ── Sort icon ─────────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  // Simple text arrows — CSS handles styling via .mb-table__sort-icon
  return (
    <span className="mb-table__sort-icon" aria-hidden="true">
      {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );
}

// ── Column header ─────────────────────────────────────────────────────────

function SortableHeader({
  field,
  sort,
  onSort,
}: {
  field: FieldDef;
  sort: SortDef;
  onSort: (sort: SortDef) => void;
}) {
  const isActive = sort.key === field.key;
  const ariaSort = isActive ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
  const cls = `mb-table__th--sortable${field.numeric ? ' mb-table__th--numeric' : ''}`;

  return (
    <th scope="col" className={cls} aria-sort={ariaSort}>
      <button
        className="mb-table__sort"
        type="button"
        onClick={() => {
          if (isActive) {
            onSort({ key: field.key, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
          } else {
            onSort({ key: field.key, dir: 'asc' });
          }
        }}
      >
        {field.label}
        <SortIcon active={isActive} dir={isActive ? sort.dir : 'asc'} />
      </button>
    </th>
  );
}

// ── Cell rendering ────────────────────────────────────────────────────────

function Cell({
  field,
  record,
  type,
  refCaches,
  isFirst,
}: {
  field: FieldDef;
  record: EntityRecord;
  type: EntityType;
  refCaches: Record<string, Record<string, string>>;
  isFirst: boolean;
}) {
  const value = record[field.key];

  // First column: entity link using titleOf
  if (isFirst) {
    return (
      <td>
        <Link
          to="/$type/$id"
          params={{ type: type === 'work_order' ? 'work-orders' : `${type}s`, id: record.id }}
          className="mb-table__entity-link"
        >
          {titleOf(type, record)}
        </Link>
      </td>
    );
  }

  // Ref field: resolve to title
  if (field.ref) {
    const cache = refCaches[field.ref];
    const refId = typeof value === 'string' ? value : null;
    const resolved = refId ? cache[refId] : undefined;
    const title = resolved ?? refId ?? '—';
    return <td>{title}</td>;
  }

  // Tagged field (status, priority, tier)
  const strValue = typeof value === 'string' ? value : null;
  const family: TagColor | null = strValue ? tagFamily(type, field.key, strValue) : null;
  if (family) {
    return (
      <td>
        <span className={`mb-tag mb-tag--${family}`}>{optionLabel(field, value)}</span>
      </td>
    );
  }

  // Date field
  if (field.type === 'date') {
    return <td className="cds--mono">{fmtDate(value as string | null)}</td>;
  }

  // Numeric field
  if (field.numeric || field.type === 'number') {
    return (
      <td className="mb-table__cell--numeric cds--tabular-nums">
        {fmtNumber(value as number | null)}
      </td>
    );
  }

  // Monospace field
  if (field.mono && value != null) {
    const display =
      typeof value === 'string'
        ? value
        : typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : JSON.stringify(value);
    return <td className="cds--mono">{display}</td>;
  }

  // Array (multiselect)
  if (Array.isArray(value)) {
    return <td>{optionLabel(field, value)}</td>;
  }

  // Default — safe display of unknown value
  const fallback =
    value == null
      ? '—'
      : typeof value === 'string'
        ? value
        : typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : JSON.stringify(value);
  return <td>{fallback}</td>;
}

// ── Row actions ───────────────────────────────────────────────────────────

function RowActions({ type, record }: { type: EntityType; record: EntityRecord }) {
  const title = titleOf(type, record);
  // Map entity type to route path segment
  const pathSegment = type === 'work_order' ? 'work-orders' : `${type}s`;

  return (
    <td className="mb-table__cell--actions">
      <Link
        to={`/${pathSegment}/${record.id}/edit`}
        className="mb-btn mb-btn--ghost"
        aria-label={`Edit ${title}`}
        title="Edit"
      >
        <Edit size={16} />
      </Link>
      <Link
        to={`/${pathSegment}/${record.id}/delete`}
        className="mb-btn mb-btn--ghost"
        aria-label={`Delete ${title}`}
        title="Delete"
      >
        <TrashCan size={16} />
      </Link>
    </td>
  );
}

// ── Skeleton rows ─────────────────────────────────────────────────────────

export function SkeletonTable({ colCount, rowCount }: { colCount: number; rowCount: number }) {
  return (
    <div className="mb-table-wrapper">
      <table className="mb-table" aria-hidden="true">
        <tbody>
          {Array.from({ length: rowCount }, (_, i) => (
            <tr key={i}>
              {Array.from({ length: colCount }, (_, j) => (
                <td key={j}>
                  <div className="mb-skeleton" style={{ width: j === 0 ? '60%' : '40%' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Full table ────────────────────────────────────────────────────────────

/**
 * Schema-driven entity table with sortable headers, tags, ref resolution,
 * row click navigation, and action buttons.
 */
export function EntityTable({ type, schema, records, refCaches, sort, onSort }: EntityTableProps) {
  const fields = schema.fields.filter((f) => !f.hiddenInList);

  return (
    <div className="mb-table-wrapper">
      <table className="mb-table">
        <thead>
          <tr>
            {fields.map((f) => (
              <SortableHeader key={f.key} field={f} sort={sort} onSort={onSort} />
            ))}
            <th scope="col" className="mb-table__th--actions">
              <span className="cds--visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} data-id={record.id}>
              {fields.map((f, i) => (
                <Cell
                  key={f.key}
                  field={f}
                  record={record}
                  type={type}
                  refCaches={refCaches}
                  isFirst={i === 0}
                />
              ))}
              <RowActions type={type} record={record} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
