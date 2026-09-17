/**
 * MonoBlocks — components/EntityTable.tsx
 *
 * Schema-driven entity data table. Proof-of-concept for container-aware
 * responsive Carbon components: below the `md` container breakpoint the table
 * switches to a stacked card layout, both built from Carbon components.
 */
import { Edit, TrashCan } from '@carbon/icons-react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tile,
} from '@carbon/react';
import { Link } from '@tanstack/react-router';

import type {
  EntityConfig,
  EntityRecord,
  EntityType,
  FieldDef,
  SortDef,
  TagColor,
} from '@/schema/types';

import { LinkButton } from '@/components/LinkButton';
import { useContainerWidth } from '@/hooks/useContainerWidth';
import {
  deletePath,
  detailPath,
  editPath,
  optionLabel,
  tagFamily,
  titleOf,
} from '@/schema/helpers';
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

// ── Helpers ───────────────────────────────────────────────────────────────

/** Resolve a raw cell value to a display-ready React node. */
function resolveCellValue(
  field: FieldDef,
  record: EntityRecord,
  type: EntityType,
  refCaches: Record<string, Record<string, string>>,
): { content: React.ReactNode; numeric?: boolean; mono?: boolean } {
  const value = record[field.key];

  if (field.ref) {
    const cache = refCaches[field.ref];
    const refId = typeof value === 'string' ? value : null;
    const resolved = refId ? cache[refId] : undefined;
    return { content: resolved ?? refId ?? '—' };
  }

  const family: TagColor | null = (() => {
    const strValue = typeof value === 'string' ? value : null;
    return strValue ? tagFamily(type, field.key, strValue) : null;
  })();
  if (family) {
    return {
      content: <Tag type={family}>{optionLabel(field, value)}</Tag>,
    };
  }

  if (field.type === 'date') {
    return { content: fmtDate(value as string | null), mono: true };
  }

  if (field.numeric || field.type === 'number') {
    return { content: fmtNumber(value as number | null), numeric: true };
  }

  if (field.mono && value != null) {
    const display =
      typeof value === 'string'
        ? value
        : typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : JSON.stringify(value);
    return { content: display, mono: true };
  }

  if (Array.isArray(value)) {
    return { content: optionLabel(field, value) };
  }

  const fallback =
    value == null
      ? '—'
      : typeof value === 'string'
        ? value
        : typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : JSON.stringify(value);
  return { content: fallback };
}

// ── Wide table cell / header ───────────────────────────────────────────────

function EntityTableCell({
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
  const { content, mono, numeric } = resolveCellValue(field, record, type, refCaches);

  if (isFirst) {
    return (
      <TableCell>
        <Link to={detailPath(type, record.id)} className="mb-table__entity-link">
          {titleOf(type, record)}
        </Link>
      </TableCell>
    );
  }

  const className = [
    mono ? 'cds--mono' : undefined,
    numeric ? 'mb-table__cell--numeric' : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return <TableCell className={className}>{content}</TableCell>;
}

function EntityTableHeader({
  field,
  sort,
  onSort,
}: {
  field: FieldDef;
  sort: SortDef;
  onSort: (sort: SortDef) => void;
}) {
  const isActive = sort.key === field.key;
  const direction = isActive ? (sort.dir === 'asc' ? 'ASC' : 'DESC') : 'NONE';

  return (
    <TableHeader
      key={field.key}
      isSortable
      isSortHeader={isActive}
      sortDirection={direction}
      onClick={() => {
        if (isActive) {
          onSort({ key: field.key, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
        } else {
          onSort({ key: field.key, dir: 'asc' });
        }
      }}
      className={field.numeric ? 'mb-table__th--numeric' : undefined}
    >
      {field.label}
    </TableHeader>
  );
}

function EntityTableActionsCell({ type, record }: { type: EntityType; record: EntityRecord }) {
  const title = titleOf(type, record);

  return (
    <TableCell className="mb-table__cell--actions">
      <LinkButton
        kind="ghost"
        size="sm"
        hasIconOnly
        renderIcon={Edit}
        iconDescription={`Edit ${title}`}
        to={editPath(type, record.id)}
        aria-label={`Edit ${title}`}
        title="Edit"
      />
      <LinkButton
        kind="ghost"
        size="sm"
        hasIconOnly
        renderIcon={TrashCan}
        iconDescription={`Delete ${title}`}
        to={deletePath(type, record.id)}
        aria-label={`Delete ${title}`}
        title="Delete"
      />
    </TableCell>
  );
}

function WideTable(props: EntityTableProps) {
  const { type, schema, records, refCaches, sort, onSort } = props;
  const fields = schema.fields.filter((f) => !f.hiddenInList);

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            {fields.map((field) => (
              <EntityTableHeader key={field.key} field={field} sort={sort} onSort={onSort} />
            ))}
            <TableHeader>
              <span className="cds--visually-hidden">Actions</span>
            </TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id} data-id={record.id}>
              {fields.map((field, i) => (
                <EntityTableCell
                  key={field.key}
                  field={field}
                  record={record}
                  type={type}
                  refCaches={refCaches}
                  isFirst={i === 0}
                />
              ))}
              <EntityTableActionsCell type={type} record={record} />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ── Narrow card layout ──────────────────────────────────────────────────────

function NarrowCards(props: EntityTableProps) {
  const { type, schema, records, refCaches, sort, onSort } = props;
  const fields = schema.fields.filter((f) => !f.hiddenInList);

  return (
    <div className="mb-entity-cards" role="list">
      {records.map((record) => (
        <Tile key={record.id} className="mb-entity-card" role="listitem">
          <div className="mb-entity-card__header">
            <Link to={detailPath(type, record.id)} className="mb-table__entity-link">
              {titleOf(type, record)}
            </Link>
          </div>
          <dl className="mb-entity-card__fields">
            {fields.slice(1).map((field) => {
              const { content, mono, numeric } = resolveCellValue(field, record, type, refCaches);
              return (
                <div key={field.key} className="mb-entity-card__field">
                  <dt className="mb-entity-card__label">{field.label}</dt>
                  <dd
                    className={[
                      mono ? 'cds--mono' : undefined,
                      numeric ? 'mb-table__cell--numeric' : undefined,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {content}
                  </dd>
                </div>
              );
            })}
          </dl>
          <div className="mb-entity-card__actions">
            <LinkButton
              kind="ghost"
              size="sm"
              hasIconOnly
              renderIcon={Edit}
              iconDescription={`Edit ${titleOf(type, record)}`}
              to={editPath(type, record.id)}
              aria-label={`Edit ${titleOf(type, record)}`}
              title="Edit"
            />
            <LinkButton
              kind="ghost"
              size="sm"
              hasIconOnly
              renderIcon={TrashCan}
              iconDescription={`Delete ${titleOf(type, record)}`}
              to={deletePath(type, record.id)}
              aria-label={`Delete ${titleOf(type, record)}`}
              title="Delete"
            />
          </div>
        </Tile>
      ))}
      <SortButtonBar fields={fields} sort={sort} onSort={onSort} />
    </div>
  );
}

function SortButtonBar({
  fields,
  sort,
  onSort,
}: {
  fields: FieldDef[];
  sort: SortDef;
  onSort: (sort: SortDef) => void;
}) {
  return (
    <div className="mb-entity-card__sort-bar" role="group" aria-label="Sort cards">
      <span className="mb-entity-card__sort-label">Sort by</span>
      {fields.map((field) => {
        const isActive = sort.key === field.key;
        return (
          <button
            key={field.key}
            type="button"
            className={`mb-entity-card__sort-button${isActive ? ' mb-entity-card__sort-button--active' : ''}`}
            onClick={() => {
              if (isActive) {
                onSort({ key: field.key, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
              } else {
                onSort({ key: field.key, dir: 'asc' });
              }
            }}
            aria-pressed={isActive}
          >
            {field.label}
            {isActive ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
          </button>
        );
      })}
    </div>
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

// ── Main component ────────────────────────────────────────────────────────

/**
 * Schema-driven entity table. Renders a Carbon DataTable on larger container
 * widths and a stacked card layout when the container is narrow.
 */
export function EntityTable(props: EntityTableProps) {
  const { ref, breakpoint } = useContainerWidth();

  return (
    <div ref={ref} className="mb-entity-table">
      {breakpoint === 'sm' ? <NarrowCards {...props} /> : <WideTable {...props} />}
    </div>
  );
}
