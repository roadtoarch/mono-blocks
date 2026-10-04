# TableResource

Typed, config-opt-in table for MonoBlocks. Carbon chrome (container, toolbar,
zebra table), TanStack Table v9 underneath. A bare
`{columns, rows, getRowId, status}` renders a plain table; each config block
unlocks one feature. The table never reorders, slices, or mutates `rows` —
sorting, paging, and filtering stay with the consumer (report-only callbacks).

## Quick start

```tsx
import { TableResource } from '@/components/TableResource';

<TableResource
  columns={[
    { key: 'title', header: 'Work order' },
    { key: 'scheduledFor', header: 'Scheduled for', className: 'cds--mono' },
  ]}
  rows={rows}
  getRowId={(row) => row.id}
  status="success"
/>;
```

## Required props

| Prop | Type | Notes |
| --- | --- | --- |
| `columns` | `TableResourceColumn<TRow>[]` | see below |
| `rows` | `readonly TRow[]` | already filtered/sorted/paged |
| `getRowId` | `(row, index) => string` | React keys + editing callbacks |
| `status` | `'initial' \| 'loading' \| 'success' \| 'error'` | lifecycle of `rows` |

## Column definition

```ts
{
  key: keyof TRow;             // required; real row field
  header: ReactNode;           // required
  render?: (row, index) => ReactNode; // wins over type/text
  type?: 'text' | 'number' | 'date' | 'boolean' | <augmented>;
  options?: <per type>;        // required iff the type declares no options
  sortKey?: string;            // reported sort id (fallback: String(key))
  className?: string;          // on body cells
  align?: 'left' | 'center' | 'right';
  editable?: boolean;          // editable only when `editing` is configured
  accessor?: (row) => unknown; // display-only; editing still reads row[key]
}
```

**Cell precedence** — `render(row, index)` wins (even for nullish values);
otherwise a nullish value shows `—`, then the registered type renderer, then
plain text. Missing registry entry → text fallback.

## View states

`status` + row count pick the body: initial / loading (Carbon SkeletonText) /
empty / error / data. **Toolbar, header row, and pagination render in every
state.** Empty defaults to `No data available.` (`hasActiveFilters` switches
to the filtered copy; `emptyState: null` renders blank). `error` + `onRetry`
drive the error row.

## Feature configs (all opt-in)

```tsx
// Sorting — single column, ASC → DESC → cleared; reported only.
sorting={{
  enabled: true,
  sort, // optional controlled echo: {key, direction} | null drives header arrows
  onChange: (sort /* {key, direction} | null */) => …,
}}

// Pagination — Carbon pager below the table, 1-based.
pagination={{ page, pageSize, totalItems, onChange: (page, pageSize) => … }}

// Row expansion — leading spacer column; panel content is synchronous.
expansion={{ ariaLabel: 'Expand row', render: (row, index) => … }}

// Row actions — trailing "Actions" column, one overflow menu per row.
actions={{ items: (row) => [{ id, label, icon?, disabled?, onClick }], header? }}

// Inline editing — columns marked `editable: true` (Enter/blur save,
// Escape cancels; a rejected promise keeps the editor open with an error).
editing={{ onSave: (rowId, patch) => void | Promise<void> }}
```

## Column visibility & persistence

- `persistKey="dashboard"` → visibility/order persist to
  `localStorage` (`mb.table.<key>.visibility` / `.order`) behind the
  toolbar's **Edit columns** menu (move up/down buttons).
- Controlled `columnVisibility` / `columnOrder` pin the matching aspect
  (controlled > persisted > `initialState` > default).
- `columnMenu={{ display: 'icon+text' }}` renders the trigger as a labelled
  text button (`'text-only'` also hides the chevron); the default stays
  icon-only. The `toolbar` slot accepts Carbon text buttons as-is.

## Column types & registry

```tsx
import { ColumnTypeRegistryProvider, defineColumnTypes } from '@/components/TableResource';

const types = defineColumnTypes({
  tag: { render: (value, options) => <Tag>{String(value)}</Tag> },
});
<ColumnTypeRegistryProvider types={types}>{children}</ColumnTypeRegistryProvider>;
```

Builtins: `text {trim?}`, `number {locale?, decimalPlaces?}`, `date`
(`format` required), `boolean`. Augment `ColumnTypeMap` via declaration
merge; `defineColumnTypes` rejects builtin keys. Registry lookup is partial —
a missing entry falls back to text.

## Legacy → new mapping

| Old (`index.tsx`) | New |
| --- | --- |
| `data` | `rows` |
| `keyExtractor` | `getRowId` (returns `string`) |
| — | `status` (derive from old `loading`/`error` booleans) |
| `columns[].isSortable` + `sorting` | `columns[].sortKey` + `sorting.enabled` |
| `onSortChange(key, direction)` incl. `'NONE'` | `sorting.onChange({key, direction} \| null)` (null = cleared) |
| `emptyMessage` | `emptyState` |
| `title` / `description` | render your own heading (the section owns it) |
| `className` (container) | `className` (container root, unchanged) |
| — | `editing` / `actions` / `expansion` / `pagination` (new) |

## Test hooks

`data-testid="pagination"` + `.tb-resource-pg`; menu triggers named
`Edit columns` / `Row actions`; expansion buttons take the configured
`ariaLabel`. Menu items are `role="menuitem"` inside `role="menu"` (use
`{ hidden: true }` in jsdom queries).
