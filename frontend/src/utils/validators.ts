/**
 * MonoBlocks — utils/validators.ts
 *
 * Sync + async validators for TanStack Form fields.
 * Port of the validateSync() and uniqueness logic from prototype form.js.
 *
 * Each validator returns `undefined` on success or a string error message.
 * They are consumed as `validators.onChange` (sync) and `validators.onBlurAsync`
 * (async uniqueness) on individual `form.Field` components.
 */
import type { EntityType, FieldDef } from '@/schema/types';

import { getEntityResource } from '@/api/resources/entity-resource-factory';

// ── Email regex (same as prototype) ────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Sync validators ───────────────────────────────────────────────────────

/**
 * Create a synchronous onChange validator for a schema field.
 * Checks: required, email format, number range, date parse.
 */
export const syncValidator = (_type: EntityType, f: FieldDef) => {
  return ({ value }: { value: unknown }): string | undefined => {
    const label = f.label.charAt(0).toLowerCase() + f.label.slice(1);
    const empty =
      value === '' ||
      value === null ||
      value === undefined ||
      (Array.isArray(value) && value.length === 0);
    if (f.required && empty) {
      return `Enter ${f.type === 'select' ? 'a ' : ''}${label}.`;
    }
    if (empty) return undefined;
    if (f.type === 'email') {
      const str = asString(value);
      if (!EMAIL_RE.test(str)) {
        return 'Enter a valid email address, e.g. name@company.com.';
      }
    }
    if (f.type === 'number') {
      const n = Number(value);
      if (Number.isNaN(n)) return `Enter a number for ${label}.`;
      if (n < 0) return `${f.label} cannot be negative.`;
      if (n > 10000000) return `${f.label} must be 10,000,000 or less.`;
    }
    if (f.type === 'date') {
      const d = new Date(`${asString(value)}T00:00:00Z`);
      if (Number.isNaN(d.getTime())) return `Enter a valid date for ${label}.`;
    }
    return undefined;
  };
};

// ── Async uniqueness validator ────────────────────────────────────────────

/**
 * Create an async onBlur validator that checks uniqueness via the entity resource.
 * Only used for fields with `f.unique === true`.
 * The excludeId parameter is the record ID being edited (for edit forms).
 */
export const uniqueValidator = (type: EntityType, f: FieldDef, excludeId?: string) => {
  return async ({ value }: { value: unknown }): Promise<string | undefined> => {
    if (!value || value === '') return undefined;
    const str = asString(value);
    if (!str) return undefined;
    const available = await getEntityResource(type).checkUnique(f.key, str, excludeId);
    if (!available) {
      return `Another ${type.replace(/_/g, ' ')} already uses this ${f.label.toLowerCase()}. It must be unique.`;
    }
    return undefined;
  };
};

// ── Helpers ────────────────────────────────────────────────────────────────

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}
