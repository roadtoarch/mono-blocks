/**
 * MonoBlocks — components/TableResource.tsx
 *
 * Data-agnostic, strongly-typed table built on Carbon's low-level Table
 * primitives. It accepts any row shape, a declarative column definition, and a
 * key extractor. The consumer is responsible for supplying already-resolved
 * data; the component itself has no opinion on whether that data came from an
 * API, a static list, or a client-side cache.
 *
 * Sorting is controlled by the consumer: the table only reports sort intent via
 * `onSortChange`. The actual sort/ordering is expected to happen at the data
 * source (e.g. an API request) and be reflected in the `data` prop.
 */
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { useCallback, useState } from 'react';

/** Sort direction for a column header. */
export type TableResourceSortDirection = 'ASC' | 'DESC' | 'NONE';

/** Column definition for a row of type T. */
export interface TableResourceColumn<T> {
  /** Stable key used for headers, React reconciliation, and sort identifiers. */
  key: string;
  /** Header content for the column. */
  header: React.ReactNode;
  /** Render the cell content for a given row. Receives the row and its index. */
  render: (row: T, index: number) => React.ReactNode;
  /** Optional CSS class applied to every body cell in this column. */
  className?: string;
  /** If true and table-level `sorting` is enabled, this column can be sorted. */
  isSortable?: boolean;
}

/** Props for the data-agnostic table. */
export interface TableResourceProps<T> {
  /** Column definitions describing how each column renders. */
  columns: readonly TableResourceColumn<T>[];
  /** Row data to display. */
  data: readonly T[];
  /** Unique key for each row. */
  keyExtractor: (row: T, index: number) => React.Key;
  /** Optional title rendered by TableContainer. */
  title?: string;
  /** Optional description rendered by TableContainer. */
  description?: string;
  /** Message shown when data is empty. */
  emptyMessage?: string;
  /** Optional class applied to the TableContainer. */
  className?: string;
  /** If true, columns marked as `isSortable` can be sorted. */
  sorting?: boolean;
  /**
   * Callback invoked when a sortable column header is clicked. The consumer
   * should use this to request a newly sorted data set from the data source.
   * Direction cycles: NONE -> ASC -> DESC -> NONE.
   */
  onSortChange?: (key: string, direction: TableResourceSortDirection) => void;
}

const cycleSortDirection = (current: TableResourceSortDirection): TableResourceSortDirection => {
  if (current === 'NONE') return 'ASC';
  if (current === 'ASC') return 'DESC';
  return 'NONE';
};

/** Generic data table backed by Carbon's low-level Table components. */
export const TableResource = <T,>({
  columns,
  data,
  keyExtractor,
  title,
  description,
  emptyMessage = 'No data available.',
  className,
  sorting = false,
  onSortChange,
}: TableResourceProps<T>): React.ReactElement => {
  const [activeSort, setActiveSort] = useState<
    { key: string; direction: TableResourceSortDirection } | undefined
  >();

  const handleSortClick = useCallback(
    (columnKey: string, currentDirection: TableResourceSortDirection) => {
      const nextDirection = cycleSortDirection(currentDirection);
      const nextSort =
        nextDirection === 'NONE' ? undefined : { key: columnKey, direction: nextDirection };

      setActiveSort(nextSort);
      onSortChange?.(columnKey, nextDirection);
    },
    [onSortChange],
  );

  const getColumnSortDirection = (columnKey: string): TableResourceSortDirection =>
    activeSort?.key === columnKey ? activeSort.direction : 'NONE';

  return (
    <TableContainer title={title} description={description} className={className}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column) => {
              const columnIsSortable = sorting && column.isSortable;
              const direction = getColumnSortDirection(column.key);

              return (
                <TableHeader
                  key={column.key}
                  isSortable={columnIsSortable}
                  isSortHeader={direction !== 'NONE'}
                  sortDirection={direction}
                  onClick={() => {
                    if (columnIsSortable) handleSortClick(column.key, direction);
                  }}
                >
                  {column.header}
                </TableHeader>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length}>{emptyMessage}</TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => (
              <TableRow key={keyExtractor(row, rowIndex)}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.render(row, rowIndex)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
