/**
 * MonoBlocks — components/FieldControl.tsx
 *
 * Schema-driven form field renderer. Renders a single form field
 * using TanStack Form's render-prop API. Supports all field types
 * from the MonoBlocks schema: text, email, tel, number, date, select,
 * multiselect, textarea, and ref (entity-relationship) selects.
 *
 * Accessibility: every field gets label, aria-describedby (helper + error),
 * aria-invalid on validation failure, and proper focus management.
 */
import * as React from 'react';

import type { FieldDef, FieldOption } from '@/schema/types';

// ── Field API shape (what TanStack Form's render prop provides) ────────────

/** The subset of FieldApi we use in FieldControl. */
interface FieldRenderProps {
  name: string;
  state: {
    value: unknown;
    meta: {
      isTouched: boolean;
      isValid: boolean;
      errors: string[];
    };
  };
  handleChange: (value: unknown) => void;
  handleBlur: () => void;
}

// ── Field control ──────────────────────────────────────────────────────────

interface FieldControlProps {
  fieldDef: FieldDef;
  field: FieldRenderProps;
  refOptions?: Record<string, { value: string; label: string }[]>;
}

export function FieldControl({ fieldDef: f, field, refOptions }: FieldControlProps) {
  const { value, handleChange, handleBlur } = field;
  const meta = field.state.meta;
  const error = meta.isTouched && !meta.isValid ? meta.errors.join(', ') : null;

  const fieldId = `mb-f-${f.key}`;
  const helperId = f.helper ? `${fieldId}-helper` : undefined;
  const errorId = `${fieldId}-error`;
  const describedBy = [helperId, errorId].filter(Boolean).join(' ');
  const isInvalid = !meta.isValid && meta.isTouched;

  return (
    <div className={`mb-form-field${error ? ' is-invalid' : ''}`} data-field={f.key}>
      {/* Label */}
      {f.type === 'multiselect' ? (
        <span className="mb-form-field__label" id={`${fieldId}-legend`}>
          {f.label}
        </span>
      ) : (
        <label className="mb-form-field__label" htmlFor={fieldId}>
          {f.label}
          {f.required ? (
            <>
              {' '}
              <span aria-hidden="true">*</span>
            </>
          ) : null}
        </label>
      )}

      {/* Control */}
      {renderControl({
        f,
        value,
        handleChange,
        handleBlur,
        fieldId,
        describedBy,
        isInvalid,
        refOptions,
      })}

      {/* Helper text */}
      {f.helper ? (
        <p className="mb-form-field__helper" id={helperId}>
          {f.helper}
        </p>
      ) : null}

      {/* Error message */}
      <p className="mb-form-field__error" id={errorId} role="alert">
        {error ? (
          <>
            <svg
              className="mb-icon mb-form-field__error-icon"
              aria-hidden="true"
              viewBox="0 0 16 16"
              width="16"
              height="16"
            >
              <path d="M8 1L14.5 13H1.5L8 1z" fill="currentColor" />
              <path d="M7.5 5.5v3h1v-3h-1zm0 4.5v1h1v-1h-1z" fill="var(--cds-text-on-color)" />
            </svg>
            <span>{error}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}

// ── Control renderer ──────────────────────────────────────────────────────

interface ControlProps {
  f: FieldDef;
  value: unknown;
  handleChange: (val: unknown) => void;
  handleBlur: () => void;
  fieldId: string;
  describedBy: string;
  isInvalid: boolean;
  refOptions?: Record<string, { value: string; label: string }[]>;
}

function renderControl(props: ControlProps) {
  const { f, value, handleChange, handleBlur, fieldId, describedBy, isInvalid, refOptions } = props;

  // Textarea
  if (f.type === 'textarea') {
    return (
      <textarea
        className="mb-textarea"
        id={fieldId}
        name={f.key}
        rows={4}
        value={asString(value)}
        onBlur={handleBlur}
        onChange={(e) => {
          handleChange(e.target.value);
        }}
        aria-describedby={describedBy}
        aria-invalid={isInvalid}
      />
    );
  }

  // Multiselect (checkbox group)
  if (f.type === 'multiselect') {
    const chosen = asArray(value);
    return (
      <div role="group" aria-labelledby={`${fieldId}-legend`} id={fieldId}>
        {f.options.map((o) => (
          <label className="mb-form-field__label" htmlFor={`${fieldId}-${o.value}`} key={o.value}>
            <input
              type="checkbox"
              id={`${fieldId}-${o.value}`}
              name={f.key}
              value={o.value}
              checked={chosen.includes(o.value)}
              onChange={(e) => {
                const next = e.target.checked
                  ? [...chosen, o.value]
                  : chosen.filter((v) => v !== o.value);
                handleChange(next);
              }}
              onBlur={() => {
                handleBlur();
              }}
              aria-invalid={isInvalid}
            />{' '}
            {o.label}
          </label>
        ))}
      </div>
    );
  }

  // Select with ref (entity-relationship)
  if (f.type === 'select' && f.ref) {
    const opts = refOptions?.[f.ref] ?? [];
    const placeholder = f.required ? 'Select…' : 'Unassigned';
    return (
      <div className="mb-select-wrapper">
        <select
          className="mb-select"
          id={fieldId}
          name={f.key}
          value={asString(value)}
          onBlur={handleBlur}
          onChange={(e) => {
            handleChange(e.target.value);
          }}
          aria-describedby={describedBy}
          aria-invalid={isInvalid}
        >
          <option value="">{placeholder}</option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Select (no ref — native options)
  if (f.type === 'select') {
    return (
      <div className="mb-select-wrapper">
        <select
          className="mb-select"
          id={fieldId}
          name={f.key}
          value={asString(value)}
          onBlur={handleBlur}
          onChange={(e) => {
            handleChange(e.target.value);
          }}
          aria-describedby={describedBy}
          aria-invalid={isInvalid}
        >
          <option value="">Select…</option>
          {f.options.map((o: FieldOption) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Input types: text, email, tel, number, date
  const inputType = f.type === 'number' ? 'number' : f.type;
  const extras: Record<string, string> = {};
  if (f.type === 'number') {
    extras.min = '0';
    extras.max = '10000000';
    extras.inputMode = 'numeric';
  }
  if (f.type === 'email') extras.autoComplete = 'email';
  if (f.type === 'tel') extras.autoComplete = 'tel';

  const displayValue = value === null || value === undefined ? '' : asString(value);

  return (
    <input
      className="mb-input"
      id={fieldId}
      name={f.key}
      type={inputType}
      value={displayValue}
      onBlur={handleBlur}
      onChange={(e) => {
        const raw = e.target.value;
        if (f.type === 'number') {
          handleChange(raw === '' ? '' : Number(raw));
        } else {
          handleChange(raw);
        }
      }}
      aria-describedby={describedBy}
      aria-invalid={isInvalid}
      {...extras}
    />
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function asString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  return [];
}
