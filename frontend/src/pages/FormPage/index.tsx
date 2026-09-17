/**
 * MonoBlocks — components/FormPage.tsx
 *
 * Generic create/edit form page. Port of prototype form.js.
 * Uses TanStack Form with schema-driven FieldControl components.
 * - Create: empty defaults, creates via mockDb.create()
 * - Edit:   pre-fills from record, updates via mockDb.update()
 *
 * Validation: sync on change (required/email/number/date), async on blur
 * (uniqueness). On submit: validates all → saves → toasts → navigates
 * to detail page.
 */
import { Button, ButtonSet, Form } from '@carbon/react';
import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import * as React from 'react';

import type { EntityType, EntityRecord, FieldDef } from '@/schema/types';

import { getEntityResource } from '@/api/resources/entity-resource-factory';
import { FieldControl } from '@/components/FieldControl';
import { LinkButton } from '@/components/LinkButton';
import { useEntityDetail, useInvalidateDetail } from '@/hooks/useEntityDetail';
import { useRefCaches } from '@/hooks/useEntityList';
import { detailPath, listPath, get, titleOf } from '@/schema/helpers';
import { toast } from '@/stores/toast';
import { syncValidator, uniqueValidator } from '@/utils/validators';

// ── Skeleton ───────────────────────────────────────────────────────────────

const SKELETON_ITEMS = [
  { id: 'sk-f1', w: '70%' },
  { id: 'sk-f2', w: '85%' },
  { id: 'sk-f3', w: '60%' },
  { id: 'sk-f4', w: '90%' },
  { id: 'sk-f5', w: '75%' },
  { id: 'sk-f6', w: '55%' },
];

function FormSkeleton() {
  return (
    <div className="mb-skeleton" aria-label="Loading form…">
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
        {isNotFound ? 'Record not found' : "Couldn't load the form"}
      </h1>
      <p className="mb-error-state__text">{error.message}</p>
      {isNotFound ? (
        <LinkButton kind="secondary" to={listHref}>
          Back to list
        </LinkButton>
      ) : (
        <Button kind="secondary" type="button" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

// ── Build default values from schema ──────────────────────────────────────

function buildDefaults(fields: FieldDef[]): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.type === 'multiselect') defaults[f.key] = [];
    else defaults[f.key] = '';
  }
  return defaults;
}

function defaultsFromRecord(fields: FieldDef[], record: EntityRecord): Record<string, unknown> {
  return Object.fromEntries(fields.map((f) => [f.key, record[f.key] ?? '']));
}

// ── Inner form component ───────────────────────────────────────────────────

interface FormContentProps {
  type: EntityType;
  editId: string;
  defaultValues: Record<string, unknown>;
  refOptions: Record<string, { value: string; label: string }[]>;
  cancelHref: string;
}

function FormContent({ type, editId, defaultValues, refOptions, cancelHref }: FormContentProps) {
  const navigate = useNavigate();
  const isEdit = editId !== '';
  const invalidateDetail = useInvalidateDetail();
  const schema = get(type);

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      try {
        const cleaned = cleanValues(value, schema.fields);
        const saved = isEdit
          ? await getEntityResource(type).update(editId, cleaned)
          : await getEntityResource(type).create(cleaned);

        invalidateDetail(type, saved.id);
        toast(
          'success',
          isEdit ? `${schema.singular} updated` : `${schema.singular} created`,
          `${titleOf(type, saved)} was saved.`,
        );
        void navigate({ to: detailPath(type, saved.id) });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'The request did not go through.';
        toast('error', 'Save failed', message);
      }
    },
  });

  return (
    <>
      <div className="mb-page-header">
        <h1 className="mb-page-header__title">
          {isEdit
            ? `Edit ${schema.singular.toLowerCase()}`
            : `Create ${schema.singular.toLowerCase()}`}
        </h1>
      </div>

      <Form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--cds-spacing-05)',
          maxWidth: 'var(--cds-form-max-width)',
        }}
      >
        {schema.fields.map((f) => (
          <form.Field
            key={f.key}
            name={f.key}
            validators={{
              onChange: syncValidator(type, f),
              ...(f.unique
                ? { onBlurAsync: uniqueValidator(type, f, isEdit ? editId : undefined) }
                : {}),
            }}
          >
            {(field) => <FieldControl fieldDef={f} field={field} refOptions={refOptions} />}
          </form.Field>
        ))}

        <ButtonSet style={{ marginBlockStart: 'var(--cds-spacing-06)' }}>
          <Button kind="primary" type="submit">
            {isEdit ? 'Save changes' : `Create ${schema.singular.toLowerCase()}`}
          </Button>
          <LinkButton kind="ghost" to={cancelHref}>
            Cancel
          </LinkButton>
        </ButtonSet>
      </Form>
    </>
  );
}

// ── FormPage ───────────────────────────────────────────────────────────────

interface FormPageProps {
  type: EntityType;
  id?: string; // undefined = create, defined = edit
}

export const FormPage = ({ type, id }: FormPageProps) => {
  const isEdit = id !== undefined;
  const editId = id ?? '';
  const schema = get(type);
  const listHref = listPath(type);
  // Load record (edit only) and ref caches — hooks always called
  const detailQuery = useEntityDetail(type, editId);
  const { refCaches } = useRefCaches(type);
  // Build ref options for select fields
  const refOptions = React.useMemo(() => {
    const opts: Record<
      string,
      {
        value: string;
        label: string;
      }[]
    > = {};
    for (const f of schema.fields) {
      if (!f.ref) continue;
      const cache = refCaches[f.ref];
      if (cache) {
        opts[f.ref] = Object.entries(cache).map(([value, label]) => ({ value, label }));
      }
    }
    return opts;
  }, [schema.fields, refCaches]);
  // Keep refs for stable callbacks
  const refetchRef = React.useRef(detailQuery.refetch);
  React.useEffect(() => {
    refetchRef.current = detailQuery.refetch;
  });
  const handleRetry = React.useCallback(() => {
    void refetchRef.current();
  }, []);
  const isLoading = isEdit && detailQuery.isLoading;
  const isError = isEdit && detailQuery.isError;
  if (isLoading) {
    return <FormSkeleton />;
  }
  if (isError) {
    const err =
      detailQuery.error instanceof Error ? detailQuery.error : new Error('Something went wrong.');
    const isNotFound = err.message.includes('not found');
    return (
      <ErrorState error={err} onRetry={handleRetry} listHref={listHref} isNotFound={isNotFound} />
    );
  }
  const record = isEdit ? detailQuery.data?.record : null;
  const defaultValues = record
    ? defaultsFromRecord(schema.fields, record)
    : buildDefaults(schema.fields);
  const cancelHref = isEdit && id ? detailPath(type, id) : listHref;
  return (
    <FormContent
      type={type}
      editId={editId}
      defaultValues={defaultValues}
      refOptions={refOptions}
      cancelHref={cancelHref}
    />
  );
};

// ── Value cleaning ────────────────────────────────────────────────────────

function cleanValues(values: Record<string, unknown>, fields: FieldDef[]): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const f of fields) {
    let val = values[f.key];
    // Trim strings
    if (typeof val === 'string') val = val.trim();
    // Empty number → null
    if (f.type === 'number' && val === '') val = null;
    cleaned[f.key] = val;
  }
  return cleaned;
}
