/**
 * MonoBlocks — components/TableResource/index.unit.test.tsx
 *
 * Barrel smoke test for the chunk-10 flip: `TableResource` resolves to the
 * typed implementation and the registry helpers are re-exported. Deep
 * behavior lives in TableResourceView.unit.test.tsx; the 14 legacy
 * characterization tests were retired with the old component they pinned.
 */
import { render, screen } from '@testing-library/react';

import {
  ColumnTypeRegistryProvider,
  TableResource,
  builtinColumnTypes,
  defineColumnTypes,
  useColumnTypeRegistry,
} from './index';

import type { TableResourceColumn } from './index';

interface Row {
  id: string;
  name: string;
}

const columns: TableResourceColumn<Row>[] = [{ key: 'name', header: 'Name' }];
const rows: Row[] = [{ id: 'r1', name: 'Alpha' }];

describe('TableResource (barrel)', () => {
  it('renders headers and rows through the barrel export', () => {
    render(
      <TableResource<Row>
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        status="success"
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'Alpha' })).toBeTruthy();
  });

  it('shows the default empty message with headers intact', () => {
    render(
      <TableResource<Row>
        columns={columns}
        rows={[]}
        getRowId={(row) => row.id}
        status="success"
      />,
    );
    expect(screen.getByText('No data available.')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeTruthy();
  });

  it('re-exports the registry helpers and provider', () => {
    expect(typeof defineColumnTypes).toBe('function');
    expect(typeof useColumnTypeRegistry).toBe('function');
    expect(typeof ColumnTypeRegistryProvider).toBe('function');
    expect(Object.keys(builtinColumnTypes).sort()).toEqual(['boolean', 'date', 'number', 'text']);
  });
});
