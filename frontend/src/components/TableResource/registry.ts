/**
 * MonoBlocks — components/TableResource/registry.ts
 *
 * Runtime column-type registry: the builtin renderers (text, number, date,
 * boolean), the `defineColumnTypes` registration helper, and the React
 * context that carries merged registrations down to the cell layer.
 *
 * Registered renderers receive a raw, non-null value; the cell layer applies
 * the null → `'—'` policy and the `render`/type/text precedence before
 * calling them.
 */
import { createContext } from 'react';

import type {
  BuiltinColumnTypeName,
  ColumnTypeDef,
  ColumnTypeRegistry,
  DefineColumnTypesArg,
} from './types';

const pad = (value: number, width: number): string => String(value).padStart(width, '0');

/** Narrows an unknown value to a `Date`, or `null` when unparseable. */
function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/** Formats a date using `YYYY`/`MM`/`DD`/`HH`/`mm`/`ss` style tokens. */
function formatDate(value: unknown, format: string): string {
  const date = toDate(value);
  if (date === null) return '—';
  return format.replace(/YYYY|YY|MM|M|DD|D|HH|H|mm|m|ss|s/g, (token) => {
    switch (token) {
      case 'YYYY':
        return pad(date.getFullYear(), 4);
      case 'YY':
        return pad(date.getFullYear() % 100, 2);
      case 'MM':
        return pad(date.getMonth() + 1, 2);
      case 'DD':
        return pad(date.getDate(), 2);
      case 'HH':
        return pad(date.getHours(), 2);
      case 'mm':
        return pad(date.getMinutes(), 2);
      case 'ss':
        return pad(date.getSeconds(), 2);
      case 'M':
        return String(date.getMonth() + 1);
      case 'D':
        return String(date.getDate());
      case 'H':
        return String(date.getHours());
      case 'm':
        return String(date.getMinutes());
      case 's':
        return String(date.getSeconds());
      default:
        return token;
    }
  });
}

/** Renderers for the builtin column types. */
export const builtinColumnTypes: { [K in BuiltinColumnTypeName]: ColumnTypeDef<K> } = {
  text: {
    render: (value, options) => {
      const text = typeof value === 'string' ? value : String(value);
      return options.trim === true ? text.trim() : text;
    },
  },
  number: {
    render: (value, options) => {
      const numeric = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(numeric)) return String(value);
      const fraction = options.decimalPlaces;
      const format =
        fraction === undefined
          ? undefined
          : { minimumFractionDigits: fraction, maximumFractionDigits: fraction };
      return numeric.toLocaleString(options.locale, format);
    },
  },
  date: {
    render: (value, options) => formatDate(value, options.format),
  },
  boolean: {
    render: (value, options) =>
      value ? (options.trueLabel ?? 'Yes') : (options.falseLabel ?? 'No'),
  },
};

/**
 * Registers every non-builtin column type of the augmented `ColumnTypeMap`.
 * The parameter type demands a complete registration record, so a missing
 * type fails to compile and builtin keys are rejected as excess properties.
 * Returns its argument unchanged — the value is the type contract.
 */
export function defineColumnTypes(types: DefineColumnTypesArg): DefineColumnTypesArg {
  return types;
}

/**
 * Registry context. Defaults to the builtin types; `ColumnTypeRegistryProvider`
 * merges application registrations on top. Lookups may be `undefined` for a
 * type that was never registered — the cell layer falls back to `text`.
 */
export const ColumnTypeRegistryContext = createContext<ColumnTypeRegistry>(builtinColumnTypes);
