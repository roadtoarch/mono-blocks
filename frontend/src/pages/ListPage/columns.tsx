/**
 * MonoBlocks — pages/ListPage/columns.tsx
 *
 * Batch A2: maps a schema entity config onto TableResource column defs —
 * the legacy EntityTable cell precedence (first column detail link, ref
 * caches, tag pills, date/number formatting, mono/numeric cell classes)
 * plus a synthetic trailing actions column carrying the inline Edit/Delete
 * icon buttons (kept per product decision; the component's own overflow
 * actions config stays unused here).
 *
 * Classes land on body cells only: the view has no header-class hook, so
 * the legacy `mb-table__th--numeric` header alignment is not reproduced.
 */
import { Edit, TrashCan } from '@carbon/icons-react';
import { Tag } from '@carbon/react';
import { Link } from '@tanstack/react-router';

import type { TableResourceColumn } from '@/components/TableResource';
import type { EntityConfig, EntityRecord, EntityType, FieldDef, TagColor } from '@/schema/types';
import type { ReactNode } from 'react';

import { LinkButton } from '@/components/LinkButton';
import {
  deletePath,
  detailPath,
  editPath,
  optionLabel,
  tagFamily,
  titleOf,
} from '@/schema/helpers';
import { date as fmtDate, number as fmtNumber } from '@/utils/format';

// ── Cell content ──────────────────────────────────────────────────────────

/**
 * Resolve a raw cell value to display-ready text or a tag, mirroring the
 * legacy `resolveCellValue` precedence minus the first-column link case.
 */
function resolveCellContent(
  field: FieldDef,
  record: EntityRecord,
  type: EntityType,
  refCaches: Record<string, Record<string, string>>,
): ReactNode {
  const value = record[field.key];

  if (field.ref) {
    const cache = refCaches[field.ref];
    const refId = typeof value === 'string' ? value : null;
    const resolved = refId ? cache[refId] : undefined;
    return resolved ?? refId ?? '—';
  }

  const strValue = typeof value === 'string' ? value : null;
  const family: TagColor | null = strValue ? tagFamily(type, field.key, strValue) : null;
  if (family) {
    return <Tag type={family}>{optionLabel(field, value)}</Tag>;
  }

  if (field.type === 'date') {
    return fmtDate(typeof value === 'string' ? value : null);
  }

  if (field.numeric || field.type === 'number') {
    return fmtNumber(typeof value === 'number' || typeof value === 'string' ? value : null);
  }

  if (field.mono && value != null) {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return optionLabel(field, value);
  }

  if (value == null) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

/**
 * Static body-cell classes for a field: mono for dates and `mono` fields,
 * right-aligned numerics — parity with the legacy per-value classes (a
 * null `mono` value now carries the class too; the text is an em dash
 * either way).
 */
function cellClassName(field: FieldDef): string | undefined {
  const parts: string[] = [];
  if (field.type === 'date' || field.mono) parts.push('cds--mono');
  if (field.numeric || field.type === 'number') parts.push('mb-table__cell--numeric');
  return parts.length > 0 ? parts.join(' ') : undefined;
}

// ── Column builder ────────────────────────────────────────────────────────

/**
 * Schema → TableResource columns: visible fields in schema order (the
 * first field becomes the detail link, sortable fields carry a `sortKey`)
 * plus the synthetic trailing actions column with inline Edit/Delete
 * buttons under a visually-hidden header.
 */
export function buildListColumns(
  type: EntityType,
  schema: EntityConfig,
  refCaches: Record<string, Record<string, string>>,
): TableResourceColumn<EntityRecord>[] {
  const fields = schema.fields.filter((field) => !field.hiddenInList);
  const columns = fields.map((field, index): TableResourceColumn<EntityRecord> => {
    const sortKey = field.sortable === true ? { sortKey: field.key } : {};

    if (index === 0) {
      return {
        key: field.key,
        header: field.label,
        ...sortKey,
        render: (record) => (
          <Link to={detailPath(type, record.id)} className="mb-table__entity-link">
            {titleOf(type, record)}
          </Link>
        ),
      };
    }

    const className = cellClassName(field);
    return {
      key: field.key,
      header: field.label,
      ...sortKey,
      ...(className !== undefined ? { className } : {}),
      render: (record) => resolveCellContent(field, record, type, refCaches),
    };
  });

  columns.push({
    key: 'actions',
    header: <span className="cds--visually-hidden">Actions</span>,
    className: 'mb-table__cell--actions',
    render: (record) => {
      const title = titleOf(type, record);
      return (
        <>
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
        </>
      );
    },
  });

  return columns;
}
