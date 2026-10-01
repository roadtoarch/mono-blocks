/**
 * MonoBlocks — components/ListPage.tsx
 *
 * Generic entity list page. Renders the page header with "Add" CTA,
 * the toolbar (filters, sort, search), and the data table with 4 states:
 * loading (skeleton), empty (no records → "Add first" CTA),
 * no-results (search/filters yielded nothing → "Clear search"), and error.
 *
 * Search is explicit-submit only (R9). Filters and sort are immediate.
 */
import { Add, Search, WarningFilled } from '@carbon/icons-react';
import { Button, Pagination } from '@carbon/react';
import * as React from 'react';

import type { EntityType, SortDef } from '@/schema/types';

import { DEFAULT_PAGE_SIZE } from '@/api/types';
import { EntityTable, SkeletonTable } from '@/components/EntityTable';
import { LinkButton } from '@/components/LinkButton';
import { ListToolbar, type ListToolbarState } from '@/components/ListToolbar';
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

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mb-error-state">
      <WarningFilled
        size={32}
        className="mb-icon mb-icon--lg mb-error-state__icon"
        aria-hidden="true"
      />
      <h2 className="mb-error-state__title">Couldn&apos;t load records</h2>
      <p className="mb-error-state__text">{message}</p>
      <Button kind="secondary" type="button" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

/**
 * Generic entity list page. One component per entity type, driven by schema.
 */
export const ListPage = ({ type }: ListPageProps) => {
  const schema = get(type);
  // Toolbar state
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
  const handleToolbarChange = React.useCallback((next: ListToolbarState) => {
    setToolbarState(next);
    setPage(0);
  }, []);
  const handleSort = React.useCallback((sort: SortDef) => {
    setToolbarState((prev) => ({ ...prev, sort }));
    setPage(0);
  }, []);
  const handleClearSearch = React.useCallback(() => {
    setToolbarState((prev) => ({ ...prev, q: '', filters: {} }));
    setPage(0);
  }, []);
  const handleRetry = React.useCallback(() => {
    void refetch();
  }, [refetch]);
  const handlePageChange = React.useCallback((next: { page: number; pageSize: number }) => {
    setPage(next.page - 1);
    setSize(next.pageSize);
  }, []);
  const fields = schema.fields.filter((f) => !f.hiddenInList);
  const colCount = fields.length + 1;
  // Determine which content to show
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

      {/* Toolbar */}
      <ListToolbar schema={schema} state={toolbarState} onChange={handleToolbarChange} />

      {/* Content */}
      {isLoading && <SkeletonTable colCount={colCount} rowCount={5} />}

      {isError && <ErrorState message={errorMessage} onRetry={handleRetry} />}

      {!isLoading && !isError && records.length === 0 && !hasActiveSearch && (
        <EmptyNoRecords type={type} />
      )}

      {!isLoading && !isError && records.length === 0 && hasActiveSearch && (
        <EmptyNoResults type={type} state={toolbarState} onClearSearch={handleClearSearch} />
      )}

      {!isLoading && !isError && records.length > 0 && (
        <EntityTable
          type={type}
          schema={schema}
          records={records}
          refCaches={refCaches}
          sort={toolbarState.sort}
          onSort={handleSort}
        />
      )}

      {!isLoading && !isError && totalItems > size && (
        <Pagination
          id="mb-pagination"
          page={page + 1}
          pageSize={size}
          pageSizes={[10, 20, 50, 100]}
          totalItems={totalItems}
          onChange={handlePageChange}
          backwardText="Previous page"
          forwardText="Next page"
        />
      )}
    </div>
  );
};
