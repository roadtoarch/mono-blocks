/**
 * MonoBlocks — pages/ListPage/index.tsx
 *
 * Generic entity list page. Renders the page header with an "Add" CTA and a
 * TableResource that owns every state: loading skeleton, error + retry, and
 * both empty flavors via `emptyState` (no records → "Add first" CTA;
 * no results → "Clear search"). Sorting is controlled through
 * `sorting.sort`, so the header arrows track the schema default and every
 * header click round-trips through `onChange` → `handleSort`. Pagination is
 * 1-based at the component edge and 0-based for `useEntityList`.
 *
 * The page-level ListToolbar (search, filters, sort select) was removed by
 * the product owner (the component is kept for later): its JSX is gone, but
 * the `ListToolbarState` wiring stays, so re-mounting is a one-line restore.
 * With no search UI mounted, `hasActiveSearch` stays false and the
 * no-results empty state is currently unreachable.
 */
import { Add, Search } from '@carbon/icons-react';
import { Button } from '@carbon/react';
import * as React from 'react';

import { buildListColumns } from './columns';

import type { EntityRecord, EntityType, SortDef } from '@/schema/types';

import { DEFAULT_PAGE_SIZE } from '@/api/types';
import { LinkButton } from '@/components/LinkButton';
import { type ListToolbarState } from '@/components/ListToolbar';
import { TableResource } from '@/components/TableResource';
import { useEntityList, useRefCaches } from '@/hooks/useEntityList';
import { get, newPath } from '@/schema/helpers';

// ── Types ─────────────────────────────────────────────────────────────────

interface ListPageProps {
  type: EntityType;
}

// ── Empty states ──────────────────────────────────────────────────────────

function EmptyNoRecords({ type }: { type: EntityType }) {
  const schema = get(type);
  return (
    <div className="mb-empty">
      <Add size={32} className="mb-icon mb-icon--lg mb-empty__icon" aria-hidden="true" />
      <h2 className="mb-empty__title">No {schema.plural.toLowerCase()} yet</h2>
      <p className="mb-empty__text">
        Get started by adding the first {schema.singular.toLowerCase()}. It will show up here right
        away.
      </p>
      <LinkButton kind="primary" to={newPath(type)}>
        Add first {schema.singular.toLowerCase()}
      </LinkButton>
    </div>
  );
}

function EmptyNoResults({
  type,
  state,
  onClearSearch,
}: {
  type: EntityType;
  state: ListToolbarState;
  onClearSearch: () => void;
}) {
  const schema = get(type);
  const hasQuery = state.q.trim() !== '';

  const why = hasQuery
    ? `No ${schema.plural.toLowerCase()} match "${state.q.trim()}".`
    : `No ${schema.plural.toLowerCase()} match the current filters.`;

  return (
    <div className="mb-empty">
      <Search size={32} className="mb-icon mb-icon--lg mb-empty__icon" aria-hidden="true" />
      <h2 className="mb-empty__title">No results found</h2>
      <p className="mb-empty__text">
        {why} Check the spelling, or try a broader term — search matches{' '}
        {schema.searchFields.join(', ').replace(/_/g, ' ')}.
      </p>
      {hasQuery && (
        <Button kind="ghost" type="button" onClick={onClearSearch}>
          Clear search
        </Button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

/**
 * Generic entity list page. One component per entity type, driven by schema.
 */
export const ListPage = ({ type }: ListPageProps) => {
  const schema = get(type);
  // Toolbar state — sort lives here; q/filters stay wired for the toolbar's
  // eventual return (and keep `useEntityList`'s params stable).
  const [toolbarState, setToolbarState] = React.useState<ListToolbarState>({
    q: '',
    filters: {},
    sort: schema.defaultSort,
  });
  // Pagination state (0-based page, matching the API)
  const [page, setPage] = React.useState(0);
  const [size, setSize] = React.useState(DEFAULT_PAGE_SIZE);
  // Data — a Spring Page<T>
  const { data, isLoading, isError, error, refetch } = useEntityList(type, {
    search: toolbarState.q,
    status: toolbarState.filters.status,
    page,
    size,
    sort: toolbarState.sort,
  });
  const records = data?.content ?? [];
  const totalItems = data?.totalElements ?? 0;
  // Ref caches for foreign-key columns
  const refCaches = useRefCaches(type);
  // Set page title
  React.useEffect(() => {
    document.title = `${schema.plural} — Cornerstone Property Services`;
  }, [schema.plural]);
  const handleSort = React.useCallback(
    (sort: SortDef) => {
      setToolbarState((prev) => ({ ...prev, sort }));
      setPage(0);
    },
    [setPage, setToolbarState],
  );
  const handleClearSearch = React.useCallback(() => {
    setToolbarState((prev) => ({ ...prev, q: '', filters: {} }));
    setPage(0);
  }, [setPage, setToolbarState]);
  const handleRetry = React.useCallback(() => {
    void refetch();
  }, [refetch]);
  const handlePageChange = React.useCallback(
    (nextPage: number, nextSize: number) => {
      setPage(nextPage - 1);
      setSize(nextSize);
    },
    [setPage, setSize],
  );
  const hasActiveSearch =
    toolbarState.q.trim() !== '' || Object.values(toolbarState.filters).some((v) => v !== '');
  // Extract error message safely
  const errorMessage = error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <div>
      {/* Page header */}
      <div className="mb-page-header">
        <h1 className="mb-page-header__title">{schema.plural}</h1>
        <div className="mb-page-header__actions">
          <LinkButton kind="primary" to={newPath(type)}>
            Add {schema.singular.toLowerCase()}
          </LinkButton>
        </div>
      </div>

      {/* Content — TableResource owns loading / error / empty / success */}
      <TableResource<EntityRecord>
        columns={buildListColumns(type, schema, refCaches)}
        rows={records}
        getRowId={(record) => record.id}
        status={isLoading ? 'loading' : isError ? 'error' : 'success'}
        error={errorMessage}
        onRetry={handleRetry}
        persistKey={`list.${type}`}
        emptyState={
          records.length === 0 ? (
            hasActiveSearch ? (
              <EmptyNoResults type={type} state={toolbarState} onClearSearch={handleClearSearch} />
            ) : (
              <EmptyNoRecords type={type} />
            )
          ) : undefined
        }
        sorting={{
          enabled: true,
          sort: {
            key: toolbarState.sort.key,
            direction: toolbarState.sort.dir === 'asc' ? 'ASC' : 'DESC',
          },
          onChange: (next) => {
            handleSort(
              next === null
                ? schema.defaultSort
                : { key: next.key, dir: next.direction === 'ASC' ? 'asc' : 'desc' },
            );
          },
        }}
        pagination={{
          page: page + 1,
          pageSize: size,
          totalItems,
          onChange: handlePageChange,
        }}
      />
    </div>
  );
};
