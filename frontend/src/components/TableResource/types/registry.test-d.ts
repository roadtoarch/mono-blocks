/**
 * MonoBlocks — components/TableResource/types/registry.test-d.ts
 *
 * Compile-time matrix for the registry contract, including a test-only
 * `tag` augmentation of `ColumnTypeMap` (no production code registers or
 * renders it). Proves: augmentation reaches columns and `defineColumnTypes`,
 * missing registrations fail to compile, and builtin keys are rejected.
 */
import { expectTypeOf } from 'vitest';

import { defineColumnTypes } from '../registry';

import type { TableResourceColumn } from './column';

declare module './column' {
  interface ColumnTypeMap {
    tag: { color?: string };
  }
}

interface Row {
  id: string;
  status: string;
}

// ── Augmentation reaches columns ─────────────────────────────────────────

export const _tagColumn: TableResourceColumn<Row> = {
  key: 'status',
  header: 'Status',
  type: 'tag',
  options: { color: 'green' },
};

export const _tagBadOption: TableResourceColumn<Row> = {
  key: 'status',
  header: 'Status',
  type: 'tag',
  // @ts-expect-error — tag options reject unknown option keys
  options: { colour: 'green' },
};

// ── defineColumnTypes contract ───────────────────────────────────────────

// @ts-expect-error — every non-builtin type (here: tag) must be registered
defineColumnTypes({});

// @ts-expect-error — builtin keys cannot be re-registered
defineColumnTypes({ text: { render: (value) => String(value) } });

export const _registered = defineColumnTypes({
  tag: {
    render: (value, options) => {
      expectTypeOf(value).toEqualTypeOf<unknown>();
      expectTypeOf(options).toEqualTypeOf<{ color?: string }>();
      return null;
    },
    editor: (props) => {
      expectTypeOf(props.value).toEqualTypeOf<unknown>();
      expectTypeOf(props.options).toEqualTypeOf<{ color?: string }>();
      props.onChange('next');
      return null;
    },
  },
});
expectTypeOf(_registered).toHaveProperty('tag');
