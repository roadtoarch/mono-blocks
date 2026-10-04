/**
 * MonoBlocks — components/TableResource/features.ts
 *
 * The single TanStack Table v9 feature set TableResource is built on.
 * Declared once so the adapter, the table instance, and every consumer agree
 * on one `TFeatures` type. All row models are manual: the parent owns data,
 * sorting, and pagination.
 */
import {
  columnOrderingFeature,
  columnVisibilityFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
} from '@tanstack/react-table';

/** Feature set used by every TableResource table instance. */
export const tableResourceFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  rowExpandingFeature,
  columnVisibilityFeature,
  columnOrderingFeature,
});
