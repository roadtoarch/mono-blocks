/**
 * MonoBlocks — components/DeletePage.tsx
 *
 * Delete confirmation page. Port of prototype delete.js.
 * Shows breadcrumb, page header, key-field summary in a tile,
 * inbound relation warnings, and Delete (danger) + Keep it (ghost) actions.
 * Full page, never a modal (per client brief).
 */
import { Link, useNavigate } from '@tanstack/react-router';
import * as React from 'react';

import type { EntityType, RelationResult } from '@/schema/types';

import { useDeleteEntity, useEntityDetail } from '@/hooks/useEntityDetail';
import {
  detailPath,
  listPath,
  get,
  listFields,
  titleOf,
  field as getField,
  optionLabel,
  tagFamily,
} from '@/schema/api';
import { toast } from '@/stores/toast';
import { date as fmtDate, number as fmtNumber } from '@/utils/format';

// ── Skeleton widths (stable keys, no Math.random) ─────────────────────────

const SKELETON_ITEMS = [
  { id: 'sk-x1', w: '70%' },
  { id: 'sk-x2', w: '85%' },
  { id: 'sk-x3', w: '60%' },
  { id: 'sk-x4', w: '90%' },
  { id: 'sk-x5', w: '50%' },
];

// ── Breadcrumb ─────────────────────────────────────────────────────────────

interface DeleteBreadcrumbProps {
  type: EntityType;
  id: string;
  title: string;
}

function DeleteBreadcrumb({ type, id, title }: DeleteBreadcrumbProps) {
  const schema = get(type);
  return (
    <nav className="mb-breadcrumb" aria-label="Breadcrumb">
      <span className="mb-breadcrumb__item">
        <Link className="mb-breadcrumb__link" to={listPath(type)}>
          {schema.plural}
        </Link>
      </span>
      <span className="mb-breadcrumb__item">
        <Link className="mb-breadcrumb__link" to={detailPath(type, id)}>
          {title}
        </Link>
      </span>
      <span className="mb-breadcrumb__item" aria-current="page">
        Delete
      </span>
    </nav>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function DeleteSkeleton() {
  return (
    <div className="mb-skeleton" aria-label="Loading record…">
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

// ── Key field display ─────────────────────────────────────────────────────

interface KeyFieldDef {
  key: string;
  type: string;
  numeric?: boolean;
  mono?: boolean;
  ref?: EntityType;
}

function keyDisplayValue(
  f: KeyFieldDef,
  record: Record<string, unknown>,
  outboundRels: RelationResult[],
): string {
  const raw = record[f.key];
  if (raw === '' || raw === null || raw === undefined) return '—';

  // Ref — resolve via outbound relation
  if (f.ref) {
    const refId = raw as string;
    const rel = outboundRels.find((r) => r.direction === 'outbound' && r.records[0]?.id === refId);
    if (rel?.records[0]) {
      return titleOf(rel.type, rel.records[0]);
    }
    return refId;
  }

  if (f.type === 'date') return fmtDate(raw as string | null);
  if (f.numeric || f.type === 'number') return fmtNumber(raw as number | null);
  if (Array.isArray(raw)) {
    // Multiselect values — join with commas
    return raw.map((v) => (typeof v === 'string' ? v : String(v))).join(', ') || '—';
  }

  return displayStr(raw);
}

/** Safe unknown → display string. */
function displayStr(value: unknown): string {
  if (value === '' || value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

// ── DeletePage ─────────────────────────────────────────────────────────────

interface DeletePageProps {
  type: EntityType;
  id: string;
}

export function DeletePage({ type, id }: DeletePageProps) {
  const navigate = useNavigate();
  const query = useEntityDetail(type, id);
  const deleteMutation = useDeleteEntity();
  const schema = get(type);
  const listHref = listPath(type);
  const [deleting, setDeleting] = React.useState(false);

  // Keep refs for stable callbacks
  const refetchRef = React.useRef(query.refetch);
  React.useEffect(() => {
    refetchRef.current = query.refetch;
  });

  const recordRef = React.useRef(query.data?.record);
  React.useEffect(() => {
    if (query.data) recordRef.current = query.data.record;
  });

  const handleRetry = React.useCallback(() => {
    void refetchRef.current();
  }, []);

  const handleDelete = React.useCallback(() => {
    if (deleting) return;
    setDeleting(true);
    deleteMutation.mutate(
      { type, id },
      {
        onSuccess: () => {
          const recordTitle = titleOf(type, recordRef.current ?? null);
          toast('success', `${schema.singular} deleted`, `${recordTitle} was removed.`);
          void navigate({ to: listHref });
        },
        onError: (err) => {
          setDeleting(false);
          const message = err instanceof Error ? err.message : 'The request did not go through.';
          toast('error', 'Delete failed', message);
        },
      },
    );
  }, [deleting, deleteMutation, type, id, schema.singular, navigate, listHref]);

  // Loading
  if (query.isLoading) {
    return <DeleteSkeleton />;
  }

  // Error
  if (query.isError) {
    const err = query.error instanceof Error ? query.error : new Error('Something went wrong.');
    const isNotFound = err.message.includes('not found');
    return (
      <ErrorState error={err} onRetry={handleRetry} listHref={listHref} isNotFound={isNotFound} />
    );
  }

  if (!query.data) return null;

  const { record, relations } = query.data;
  const title = titleOf(type, record);

  // Key fields: title field + first four list-visible fields (deduped)
  const titleField = schema.titleField;
  const listVisible = listFields(type).map((f) => f.key);
  const keyFields = [titleField, ...listVisible]
    .filter((k, i, arr) => arr.indexOf(k) === i)
    .slice(0, 5);

  // Outbound relations for ref resolution
  const outboundRels = relations.filter((r) => r.direction === 'outbound');

  // Inbound warnings
  const inbound = relations.filter((r) => r.direction === 'inbound' && r.records.length > 0);

  return (
    <>
      <DeleteBreadcrumb type={type} id={id} title={title} />

      <div className="mb-page-header mb-page-header--detail">
        <h1 className="mb-page-header__title">Delete {schema.singular.toLowerCase()}?</h1>
      </div>

      <div className="mb-delete-summary">
        <h2 className="mb-delete-summary__title">{title}</h2>
        <dl className="mb-def-list">
          <dt>Record ID</dt>
          <dd className="cds--mono">{record.id}</dd>
          {keyFields.map((key) => {
            const f = getField(type, key);
            if (!f) return null;
            const raw = record[key];
            const family = tagFamily(type, key, raw as string | null);
            const display =
              family && raw ? optionLabel(f, raw) : keyDisplayValue(f, record, outboundRels);
            const isMono = f.mono && record[key];
            return (
              <React.Fragment key={key}>
                <dt>{f.label}</dt>
                <dd className={isMono ? 'cds--mono' : undefined}>{displayStr(display)}</dd>
              </React.Fragment>
            );
          })}
        </dl>
      </div>

      <p className="mb-form-field__helper" id="mb-delete-copy">
        This action cannot be undone. The {schema.singular.toLowerCase()} and its event history will
        be permanently removed.
      </p>

      {inbound.length > 0 && (
        <p className="mb-form-field__helper" id="mb-delete-warning">
          {inbound
            .map((r) => `${String(r.records.length)} linked ${r.label.toLowerCase()}`)
            .join(' and ')}{' '}
          will lose their reference to this {schema.singular.toLowerCase()}.
        </p>
      )}

      <div className="mb-form__actions">
        <button
          className="mb-btn mb-btn--danger"
          type="button"
          onClick={handleDelete}
          disabled={deleting}
        >
          Delete
        </button>
        <Link className="mb-btn mb-btn--ghost" to={detailPath(type, id)}>
          Keep it
        </Link>
      </div>
    </>
  );
}
