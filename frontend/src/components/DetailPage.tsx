/**
 * MonoBlocks — components/DetailPage.tsx
 *
 * Generic entity detail page. Port of prototype detail.js.
 * Shows breadcrumb, page header (with Edit/Delete links), a definition list
 * of every schema field, resolved relation sections, and an event timeline.
 */
import { Link } from '@tanstack/react-router';
import * as React from 'react';

import type { EntityType, EntityRecord, FieldDef, RelationResult } from '@/schema/types';

import { useEntityDetail } from '@/hooks/useEntityDetail';
import {
  detailPath,
  editPath,
  deletePath,
  listPath,
  get,
  optionLabel,
  tagFamily,
  titleOf,
  field as getField,
} from '@/schema/helpers';
import { date as fmtDate, dateTime as fmtDateTime, number as fmtNumber } from '@/utils/format';

// ── Skeleton widths (stable keys, no Math.random) ─────────────────────────

const SKELETON_ITEMS = [
  { id: 'sk-d1', w: '70%' },
  { id: 'sk-d2', w: '85%' },
  { id: 'sk-d3', w: '60%' },
  { id: 'sk-d4', w: '90%' },
  { id: 'sk-d5', w: '75%' },
  { id: 'sk-d6', w: '55%' },
  { id: 'sk-d7', w: '80%' },
  { id: 'sk-d8', w: '65%' },
];

// ── Breadcrumb ─────────────────────────────────────────────────────────────

interface BreadcrumbProps {
  type: EntityType;
  title: string;
}

function Breadcrumb({ type, title }: BreadcrumbProps) {
  const schema = get(type);
  return (
    <nav className="mb-breadcrumb" aria-label="Breadcrumb">
      <span className="mb-breadcrumb__item">
        <Link className="mb-breadcrumb__link" to={listPath(type)}>
          {schema.plural}
        </Link>
      </span>
      <span className="mb-breadcrumb__item" aria-current="page">
        {title}
      </span>
    </nav>
  );
}

// ── Field value renderer ──────────────────────────────────────────────────

interface FieldValueProps {
  fieldDef: FieldDef;
  record: EntityRecord;
  relTitles: Record<string, Record<string, string>>;
  type: EntityType;
}

function FieldValue({ fieldDef, record, relTitles, type }: FieldValueProps) {
  const value = record[fieldDef.key];

  // Ref field — show link to related record
  if (fieldDef.ref) {
    if (!value) return <dd>—</dd>;
    const refId = value as string;
    const title = relTitles[fieldDef.ref][refId] || refId;
    return (
      <dd>
        <Link className="mb-table__entity-link" to={detailPath(fieldDef.ref, refId)}>
          {title}
        </Link>
      </dd>
    );
  }

  // Tagged select field
  const family = tagFamily(type, fieldDef.key, value as string | null);
  if (family && value) {
    return (
      <dd>
        <span className={`mb-tag mb-tag--${family}`}>{optionLabel(fieldDef, value)}</span>
      </dd>
    );
  }

  // Date
  if (fieldDef.type === 'date') {
    return <dd className="cds--mono cds--tabular-nums">{fmtDate(value as string | null)}</dd>;
  }

  // Number / numeric
  if (fieldDef.numeric || fieldDef.type === 'number') {
    return <dd className="cds--tabular-nums">{fmtNumber(value as number | null)}</dd>;
  }

  // Monospace
  if (fieldDef.mono && value) {
    return <dd className="cds--mono">{displayStr(value)}</dd>;
  }

  // Array (multiselect)
  if (Array.isArray(value)) {
    return <dd>{optionLabel(fieldDef, value) || '—'}</dd>;
  }

  return <dd>{displayStr(value)}</dd>;
}

/** Safe unknown → display string. Empty/nullish → em-dash. */
function displayStr(value: unknown): string {
  if (value === '' || value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

// ── Event humanizer ────────────────────────────────────────────────────────

interface EventItemProps {
  eventType: string;
  payload: Record<string, unknown>;
  entityType: EntityType;
}

function EventItem({ eventType: eType, payload, entityType }: EventItemProps) {
  // Capitalize first letter only (sentence-style, matching prototype)
  const words = eType.replace(/_/g, ' ');
  const label = words.charAt(0).toUpperCase() + words.slice(1);

  // Enhance payload values using schema option labels
  const bits = Object.entries(payload)
    .map(([key, val]) => {
      if (val === null || val === undefined || val === '') return null;
      const f = getField(entityType, key);
      // optionLabel always returns string; when no schema match, use raw val
      const displayVal: string = f ? optionLabel(f, val) : displayStr(val);
      const k = key.replace(/_/g, ' ').replace(/ id$/, '');
      return `${k}: ${displayVal}`;
    })
    .filter((b): b is string => b !== null);

  const text = bits.length ? `${label} — ${bits.join(', ')}` : label;
  return <dd>{text}</dd>;
}

// ── Relation section ──────────────────────────────────────────────────────

interface RelationSectionProps {
  rel: RelationResult;
}

function RelationSection({ rel }: RelationSectionProps) {
  return (
    <section className="mb-section" aria-label={rel.label}>
      <h2 className="mb-section__title">{rel.label}</h2>
      <ul>
        {rel.records.map((rec) => (
          <li key={rec.id}>
            <Link className="mb-table__entity-link" to={detailPath(rel.type, rec.id)}>
              {titleOf(rel.type, rec)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="mb-skeleton" aria-label="Loading detail…">
      {SKELETON_ITEMS.map((s) => (
        <div key={s.id} className="mb-skeleton__line" style={{ width: s.w }} />
      ))}
    </div>
  );
}

// ── Error state ────────────────────────────────────────────────────────────

interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
  listHref: string;
  isNotFound: boolean;
}

function ErrorState({ error, onRetry, listHref, isNotFound }: ErrorStateProps) {
  return (
    <div className="mb-error-state">
      <h1 className="mb-error-state__title">
        {isNotFound ? 'Record not found' : "Couldn't load this record"}
      </h1>
      <p className="mb-error-state__text">{error.message}</p>
      {isNotFound ? (
        <Link className="mb-btn mb-btn--secondary" to={listHref}>
          Back to list
        </Link>
      ) : (
        <button className="mb-btn mb-btn--secondary" type="button" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

// ── DetailPage ─────────────────────────────────────────────────────────────

interface DetailPageProps {
  type: EntityType;
  id: string;
}

export function DetailPage({ type, id }: DetailPageProps) {
  const query = useEntityDetail(type, id);
  const schema = get(type);
  const listHref = listPath(type);

  // Keep a ref to refetch for stable callback
  const refetchRef = React.useRef(query.refetch);
  React.useEffect(() => {
    refetchRef.current = query.refetch;
  });

  const handleRetry = React.useCallback(() => {
    void refetchRef.current();
  }, []);

  // Build ref title map from outbound relations
  const relTitles = React.useMemo<Record<string, Record<string, string>>>(() => {
    if (!query.data) return {};
    const titles: Record<string, Record<string, string>> = {};
    for (const rel of query.data.relations) {
      if (rel.direction !== 'outbound') continue;
      titles[rel.type] = titles[rel.type] ?? {};
      for (const rec of rel.records) {
        titles[rel.type][rec.id] = titleOf(rel.type, rec);
      }
    }
    return titles;
  }, [query.data]);

  // Loading state
  if (query.isLoading) {
    return <DetailSkeleton />;
  }

  // Error state
  if (query.isError) {
    const err = query.error instanceof Error ? query.error : new Error('Something went wrong.');
    const isNotFound = err.message.includes('not found');
    return (
      <ErrorState error={err} onRetry={handleRetry} listHref={listHref} isNotFound={isNotFound} />
    );
  }

  if (!query.data) return null;

  const { record, relations, events } = query.data;
  const title = titleOf(type, record);

  // Filtered relations (only those with records)
  const visibleRelations = relations.filter((r) => r.records.length > 0);

  return (
    <>
      <Breadcrumb type={type} title={title} />

      <div className="mb-page-header mb-page-header--detail">
        <h1 className="mb-page-header__title">{title}</h1>
        <div className="mb-page-header__actions">
          <Link className="mb-btn mb-btn--secondary" to={editPath(type, record.id)}>
            Edit
          </Link>
          <Link className="mb-btn mb-btn--danger" to={deletePath(type, record.id)}>
            Delete
          </Link>
        </div>
      </div>

      {/* Attributes section */}
      <section className="mb-section" aria-label="Attributes">
        <h2 className="mb-section__title">Attributes</h2>
        <dl className="mb-def-list">
          <dt>Record ID</dt>
          <dd className="cds--mono">{record.id}</dd>
          {schema.fields.map((f) => (
            <React.Fragment key={f.key}>
              <dt>{f.label}</dt>
              <FieldValue fieldDef={f} record={record} relTitles={relTitles} type={type} />
            </React.Fragment>
          ))}
        </dl>
      </section>

      {/* Relation sections */}
      {visibleRelations.map((rel) => (
        <RelationSection key={`${rel.direction}-${rel.type}-${rel.rel}`} rel={rel} />
      ))}

      {/* Event history */}
      <section className="mb-section" aria-label="Event history">
        <h2 className="mb-section__title">Event history</h2>
        {events.length > 0 ? (
          <dl className="mb-def-list">
            {events.map((evt) => (
              <React.Fragment key={evt.id}>
                <dt className="cds--mono">{fmtDateTime(evt.timestamp)}</dt>
                <EventItem eventType={evt.event_type} payload={evt.payload} entityType={type} />
              </React.Fragment>
            ))}
          </dl>
        ) : (
          <p className="mb-form-field__helper">No events recorded for this record yet.</p>
        )}
      </section>
    </>
  );
}
