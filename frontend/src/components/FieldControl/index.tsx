/**
 * MonoBlocks — components/FieldControl.tsx
 *
 * Schema-driven form field renderer. Renders a single form field
 * using TanStack Form's render-prop API. Supports all field types
 * from the MonoBlocks schema: text, email, tel, number, date, select,
 * multiselect, textarea, and ref (entity-relationship) selects.
 *
 * Accessibility: every field uses Carbon's built-in label, helper text,
 * and invalid/invalidText props for validation state.
 */
import {
  Checkbox,
  FormGroup,
  NumberInput,
  Select,
  SelectItem,
  TextArea,
  TextInput,
} from '@carbon/react';
import * as React from 'react';

import type { FieldDef } from '@/schema/types';

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

interface FieldControlProps {
  fieldDef: FieldDef;
  field: FieldRenderProps;
  refOptions?: Record<string, { value: string; label: string }[]>;
}

export const FieldControl = ({ fieldDef: f, field, refOptions }: FieldControlProps) => {
  const value = field.state.value;
  const { handleChange, handleBlur } = field;
  const meta = field.state.meta;
  const error = meta.isTouched && !meta.isValid ? meta.errors.join(', ') : null;
  const isInvalid = Boolean(error);
  const fieldId = `mb-f-${f.key}`;
  const label = (
    <>
      {f.label}
      {f.required ? (
        <>
          {' '}
          <span aria-hidden="true">*</span>
        </>
      ) : null}
    </>
  );
  return (
    <div data-field={f.key}>
      {renderControl({
        f,
        value,
        handleChange,
        handleBlur,
        fieldId,
        label,
        isInvalid,
        error,
        refOptions,
      })}
    </div>
  );
};

// ── Control renderer ──────────────────────────────────────────────────────

interface ControlProps {
  f: FieldDef;
  value: unknown;
  handleChange: (val: unknown) => void;
  handleBlur: () => void;
  fieldId: string;
  label: React.ReactNode;
  isInvalid: boolean;
  error: string | null;
  refOptions?: Record<string, { value: string; label: string }[]>;
}

function renderControl(props: ControlProps) {
  const { f, value, handleChange, handleBlur, fieldId, label, isInvalid, error } = props;

  // Textarea
  if (f.type === 'textarea') {
    return (
      <TextArea
        id={fieldId}
        name={f.key}
        labelText={label}
        helperText={f.helper ?? undefined}
        invalid={isInvalid}
        invalidText={error ?? undefined}
        rows={4}
        value={asString(value)}
        onBlur={() => {
          handleBlur();
        }}
        onChange={(e) => {
          handleChange(e.target.value);
        }}
      />
    );
  }

  // Multiselect (checkbox group)
  if (f.type === 'multiselect') {
    const chosen = asArray(value);
    return (
      <FormGroup legendText={label} invalid={isInvalid}>
        {f.helper ? <p className="mb-field-helper">{f.helper}</p> : null}
        {f.options.map((o) => (
          <Checkbox
            key={o.value}
            id={`${fieldId}-${o.value}`}
            labelText={o.label}
            name={f.key}
            value={o.value}
            checked={chosen.includes(o.value)}
            invalid={isInvalid}
            onBlur={() => {
              handleBlur();
            }}
            onChange={(_, data) => {
              const next = data.checked
                ? [...chosen, o.value]
                : chosen.filter((v) => v !== o.value);
              handleChange(next);
            }}
          />
        ))}
        {isInvalid && error ? (
          <p className="mb-field-error" role="alert">
            {error}
          </p>
        ) : null}
      </FormGroup>
    );
  }

  // Select with ref (entity-relationship)
  if (f.type === 'select' && f.ref) {
    const opts = props.refOptions?.[f.ref] ?? [];
    const placeholder = f.required ? 'Select…' : 'Unassigned';
    return (
      <Select
        id={fieldId}
        name={f.key}
        labelText={label}
        helperText={f.helper ?? undefined}
        invalid={isInvalid}
        invalidText={error ?? undefined}
        value={asString(value)}
        onBlur={() => {
          handleBlur();
        }}
        onChange={(e) => {
          handleChange(e.target.value);
        }}
      >
        <SelectItem value="" text={placeholder} />
        {opts.map((o) => (
          <SelectItem key={o.value} value={o.value} text={o.label} />
        ))}
      </Select>
    );
  }

  // Select (no ref — native options)
  if (f.type === 'select') {
    return (
      <Select
        id={fieldId}
        name={f.key}
        labelText={label}
        helperText={f.helper ?? undefined}
        invalid={isInvalid}
        invalidText={error ?? undefined}
        value={asString(value)}
        onBlur={() => {
          handleBlur();
        }}
        onChange={(e) => {
          handleChange(e.target.value);
        }}
      >
        <SelectItem value="" text="Select…" />
        {f.options.map((o) => (
          <SelectItem key={o.value} value={o.value} text={o.label} />
        ))}
      </Select>
    );
  }

  // Number
  if (f.type === 'number') {
    return (
      <NumberInput
        id={fieldId}
        name={f.key}
        label={label}
        helperText={f.helper ?? undefined}
        invalid={isInvalid}
        invalidText={error ?? undefined}
        value={value === '' || value === null || value === undefined ? '' : Number(value)}
        min={0}
        max={10000000}
        allowEmpty
        type="number"
        onBlur={() => {
          handleBlur();
        }}
        onChange={(_, data) => {
          handleChange(data.value === '' ? '' : Number(data.value));
        }}
      />
    );
  }

  // Input types: text, email, tel, date
  const extras: React.InputHTMLAttributes<HTMLInputElement> = {};
  if (f.type === 'email') extras.autoComplete = 'email';
  if (f.type === 'tel') extras.autoComplete = 'tel';
  if (f.type === 'number') {
    extras.min = 0;
    extras.max = 10000000;
    extras.inputMode = 'numeric';
  }

  const displayValue = value === null || value === undefined ? '' : asString(value);

  return (
    <TextInput
      id={fieldId}
      name={f.key}
      type={f.type}
      labelText={label}
      helperText={f.helper ?? undefined}
      invalid={isInvalid}
      invalidText={error ?? undefined}
      value={displayValue}
      onBlur={() => {
        handleBlur();
      }}
      onChange={(e) => {
        handleChange(e.target.value);
      }}
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
