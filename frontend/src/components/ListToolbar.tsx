/**
 * MonoBlocks — components/ListToolbar.tsx
 *
 * Toolbar above the entity table: filter selects (immediate), sort select
 * (immediate), and an explicit-submit search bar (button/Enter only — never
 * fires on keystroke, per client requirement R9).
 */
import { useForm } from '@tanstack/react-form';

import type { EntityConfig, FieldDef, SortDef } from '@/schema/types';

// ── Types ─────────────────────────────────────────────────────────────────

export interface ListToolbarState {
  q: string;
  filters: Record<string, string>;
  sort: SortDef;
}

interface ListToolbarProps {
  schema: EntityConfig;
  state: ListToolbarState;
  onChange: (state: ListToolbarState) => void;
}

// ── Filter select ─────────────────────────────────────────────────────────

function FilterSelect({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="mb-form-field">
      <label className="mb-form-field__label" htmlFor={`mb-filter-${field.key}`}>
        {field.label}
      </label>
      <div className="mb-select-wrapper">
        <select
          className="mb-select"
          id={`mb-filter-${field.key}`}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
        >
          <option value="">All</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Sort select ───────────────────────────────────────────────────────────

function SortSelect({
  fields,
  sort,
  onChange,
}: {
  fields: FieldDef[];
  sort: SortDef;
  onChange: (s: SortDef) => void;
}) {
  return (
    <div className="mb-form-field">
      <label className="mb-form-field__label" htmlFor="mb-sort">
        Sort by
      </label>
      <div className="mb-select-wrapper">
        <select
          className="mb-select"
          id="mb-sort"
          value={`${sort.key}:${sort.dir}`}
          onChange={(e) => {
            const [key, dir] = e.target.value.split(':');
            onChange({ key, dir: dir === 'desc' ? 'desc' : 'asc' });
          }}
        >
          {fields.map((f) => [
            <option key={`${f.key}:asc`} value={`${f.key}:asc`}>
              {f.label} (ascending)
            </option>,
            <option key={`${f.key}:desc`} value={`${f.key}:desc`}>
              {f.label} (descending)
            </option>,
          ])}
        </select>
      </div>
    </div>
  );
}

// ── Search bar ────────────────────────────────────────────────────────────

function SearchBar({
  placeholder,
  value,
  onSubmit,
}: {
  placeholder: string;
  value: string;
  onSubmit: (q: string) => void;
}) {
  const form = useForm({
    defaultValues: { q: value },
    onSubmit: ({ value: vals }) => {
      onSubmit(vals.q);
    },
  });

  return (
    <form
      className="mb-search-bar"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <div className="mb-form-field">
        <label className="mb-form-field__label" htmlFor="mb-search-input">
          Search {placeholder}
        </label>
        <form.Field name="q">
          {(field) => (
            <input
              className="mb-input"
              type="search"
              id="mb-search-input"
              name="q"
              placeholder={`Search by ${placeholder}`}
              autoComplete="off"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => {
                field.handleChange(e.target.value);
              }}
            />
          )}
        </form.Field>
      </div>
      <button className="mb-btn mb-btn--primary" type="submit">
        Search
      </button>
    </form>
  );
}

// ── Main toolbar ──────────────────────────────────────────────────────────

/**
 * Toolbar for the entity list page.
 * - Filters: immediate on change
 * - Sort: immediate on change
 * - Search: explicit submit only (button click or Enter)
 */
export function ListToolbar({ schema, state, onChange }: ListToolbarProps) {
  const filterableFields = schema.fields.filter((f) => f.filterable);
  const listFlds = schema.fields.filter((f) => !f.hiddenInList);

  const searchPlaceholder = schema.searchFields
    .map((key) => {
      const f = schema.fields.find((fld) => fld.key === key);
      return f ? f.label.toLowerCase() : key;
    })
    .join(', ');

  return (
    <div className="mb-toolbar">
      {filterableFields.map((f) => (
        <FilterSelect
          key={f.key}
          field={f}
          value={state.filters[f.key] ?? ''}
          onChange={(val) => {
            const { [f.key]: _, ...rest } = state.filters;
            const next = val ? { ...state.filters, [f.key]: val } : rest;
            onChange({ ...state, filters: next });
          }}
        />
      ))}

      <SortSelect
        fields={listFlds}
        sort={state.sort}
        onChange={(sort) => {
          onChange({ ...state, sort });
        }}
      />

      <SearchBar
        placeholder={searchPlaceholder}
        value={state.q}
        onSubmit={(q) => {
          onChange({ ...state, q });
        }}
      />
    </div>
  );
}
