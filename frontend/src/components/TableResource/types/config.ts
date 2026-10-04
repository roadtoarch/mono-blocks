/**
 * MonoBlocks — components/TableResource/types/config.ts
 *
 * Props and configuration objects for the typed TableResource. Everything is
 * opt-in: a bare `{columns, rows, getRowId, status}` renders a plain table,
 * and each config unlocks one feature (sorting, pagination, expansion,
 * editing, actions, visibility/order).
 */
import type { TableResourceColumn } from './column';
import type { RowData } from '@tanstack/react-table';
import type { ReactNode } from 'react';

/** Lifecycle of the parent's data fetch, mirroring the query layer. */
export type TableResourceStatus = 'initial' | 'loading' | 'success' | 'error';

/** Controlled column visibility: column key → visible. */
export type TableResourceColumnVisibility = Record<string, boolean>;

/** Controlled column order: ordered list of column keys. */
export type TableResourceColumnOrder = string[];

/** A resolved sort request reported to the consumer. */
export interface TableResourceSortChange {
  /** The sort identifier: the column's `sortKey` (or its key as fallback). */
  key: string;
  /** Single sort direction; a third click reports `null` (cleared). */
  direction: 'ASC' | 'DESC';
}

/** Sorting configuration. */
export interface TableResourceSortingConfig {
  /** Enables sortable headers when true (default false). */
  enabled?: boolean;
  /** Reports sort intent; pass `null` when sorting is cleared. */
  onChange?: (sort: TableResourceSortChange | null) => void;
}

/** Pagination configuration. Page numbers are 1-based. */
export interface TableResourcePaginationConfig {
  /** Current 1-based page. */
  page?: number;
  /** Rows per page. */
  pageSize?: number;
  /** Total rows across all pages (enables page-count reporting). */
  totalItems?: number;
  /** Reports a requested page (1-based) and page size. */
  onChange?: (page: number, pageSize: number) => void;
}

/** One entry in a row's overflow actions menu. */
export interface TableResourceAction<TRow> {
  /** Stable identifier within the menu. */
  id: string;
  /** Visible menu item label. */
  label: string;
  /** Optional leading icon. */
  icon?: ReactNode;
  /** Invoked with the row this action belongs to. */
  onClick: (row: TRow) => void;
  /** Disables this item for this row. */
  disabled?: boolean;
}

/** Row actions configuration. */
export interface TableResourceActionsConfig<TRow> {
  /** Computes the actions available for a row. */
  items: (row: TRow) => readonly TableResourceAction<TRow>[];
  /** Header cell content for the actions column (default `'Actions'`). */
  header?: ReactNode;
}

/** Row expansion configuration. */
export interface TableResourceExpansionConfig<TRow> {
  /** Renders the expanded content for a row. */
  render: (row: TRow, index: number) => ReactNode;
  /** Accessible name for the expand/collapse control (required). */
  ariaLabel: string;
}

/** Inline editing configuration. */
export interface TableResourceEditingConfig<TRow> {
  /**
   * Persists a single edited cell: the row id plus a one-key patch. Rejecting
   * the returned promise keeps the editor open with an error; resolving
   * returns the cell to its read-only state without local echo.
   */
  onSave: (rowId: string, patch: Partial<TRow>) => void | Promise<void>;
}

/** Initial state for controlled-when-configured slices. */
export interface TableResourceInitialState {
  /** Initially hidden columns. */
  columnVisibility?: TableResourceColumnVisibility;
  /** Initially ordered column keys. */
  columnOrder?: TableResourceColumnOrder;
}

/** Props for the typed TableResource. */
export interface TableResourceProps<TRow extends RowData> {
  /** Column definitions. */
  columns: readonly TableResourceColumn<TRow>[];
  /** Rows to display (already filtered/sorted/paged by the consumer). */
  rows: readonly TRow[];
  /** Stable row identity used for React keys and editing callbacks. */
  getRowId: (row: TRow, index: number) => string;
  /** Lifecycle of `rows`. */
  status: TableResourceStatus;

  /** Keeps rows visible with a refetch indicator while true. */
  isRefetching?: boolean;
  /** Error content shown in the error state (with `onRetry`). */
  error?: ReactNode;
  /** Retry callback for the error state. */
  onRetry?: () => void;
  /** Custom empty-state content. */
  emptyState?: ReactNode;
  /** Initial visibility/order for column state. */
  initialState?: TableResourceInitialState;
  /** Distinguishes "no results" from "no data" in the empty state. */
  hasActiveFilters?: boolean;
  /** Skeleton row count while loading (default: page size, else 10). */
  skeletonRowCount?: number;
  /** Extra toolbar content rendered above the table in every state. */
  toolbar?: ReactNode;
  /** Class applied to the table container root. */
  className?: string;
  /** Identifier for persisted column visibility/order (`mb.table.<key>.*`). */
  persistKey?: string;

  /** Enables column sorting. */
  sorting?: TableResourceSortingConfig;
  /** Enables pagination (1-based). */
  pagination?: TableResourcePaginationConfig;
  /** Enables expandable rows. */
  expansion?: TableResourceExpansionConfig<TRow>;
  /** Enables inline cell editing for columns marked `editable`. */
  editing?: TableResourceEditingConfig<TRow>;
  /** Enables the per-row overflow actions menu. */
  actions?: TableResourceActionsConfig<TRow>;
  /** Controlled column visibility. */
  columnVisibility?: TableResourceColumnVisibility;
  /** Controlled column order. */
  columnOrder?: TableResourceColumnOrder;
}
