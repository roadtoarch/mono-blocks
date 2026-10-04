/**
 * MonoBlocks — components/TableResource/states.unit.test.tsx
 *
 * Isolated rendering tests for the four body-state components. Each renders
 * exactly one row whose single cell spans the given colSpan, mirroring the
 * old component's empty-row structure.
 */
import { Table, TableBody } from '@carbon/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TableResourceEmptyState } from './TableResourceEmptyState';
import { TableResourceErrorState } from './TableResourceErrorState';
import { TableResourceInitialState } from './TableResourceInitialState';
import { TableResourceLoadingState } from './TableResourceLoadingState';

import type { ReactElement, ReactNode } from 'react';

function renderState(ui: ReactElement) {
  return render(
    <Table>
      <TableBody>{ui}</TableBody>
    </Table>,
  );
}

function skeletonLines(container: HTMLElement): number {
  return container.querySelectorAll('.cds--skeleton__text').length;
}

describe('TableResourceInitialState', () => {
  it('renders the initial copy in a single row spanning colSpan', () => {
    const { container } = renderState(<TableResourceInitialState colSpan={4} />);
    expect(screen.getByText('Nothing to display yet.').getAttribute('colspan')).toBe('4');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('TableResourceLoadingState', () => {
  it('renders 10 skeleton lines by default', () => {
    const { container } = renderState(<TableResourceLoadingState colSpan={3} />);
    expect(skeletonLines(container)).toBe(10);
    expect(screen.getByRole('cell').getAttribute('colspan')).toBe('3');
  });

  it('prefers skeletonRowCount over pageSize', () => {
    const { container } = renderState(
      <TableResourceLoadingState colSpan={3} skeletonRowCount={5} pageSize={7} />,
    );
    expect(skeletonLines(container)).toBe(5);
  });

  it('falls back to pageSize when skeletonRowCount is absent', () => {
    const { container } = renderState(<TableResourceLoadingState colSpan={3} pageSize={7} />);
    expect(skeletonLines(container)).toBe(7);
  });
});

describe('TableResourceEmptyState', () => {
  it('renders the default no-data message', () => {
    renderState(<TableResourceEmptyState colSpan={2} />);
    const cell = screen.getByText('No data available.');
    expect(cell.getAttribute('colspan')).toBe('2');
  });

  it('renders the filtered message when filters are active', () => {
    renderState(<TableResourceEmptyState colSpan={2} hasActiveFilters />);
    expect(screen.getByText('No results match the current filters.')).toBeTruthy();
    expect(screen.queryByText('No data available.')).toBeNull();
  });

  it('lets a custom emptyState node override the default message', () => {
    const custom: ReactNode = <strong>Nothing matches.</strong>;
    renderState(<TableResourceEmptyState colSpan={2} emptyState={custom} />);
    expect(screen.getByText('Nothing matches.').tagName).toBe('STRONG');
    expect(screen.queryByText('No data available.')).toBeNull();
  });

  it('renders a blank cell when emptyState is explicitly null', () => {
    renderState(<TableResourceEmptyState colSpan={2} emptyState={null} />);
    expect(screen.getByRole('cell').textContent).toBe('');
  });
});

describe('TableResourceErrorState', () => {
  it('renders the generic fallback when no error is provided', () => {
    renderState(<TableResourceErrorState colSpan={2} />);
    expect(screen.getByText('Something went wrong.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders the provided error and no retry button without onRetry', () => {
    renderState(<TableResourceErrorState colSpan={2} error="Boom" />);
    expect(screen.getByText('Boom')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('invokes onRetry from the Retry button when provided', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderState(<TableResourceErrorState colSpan={2} error="Boom" onRetry={onRetry} />);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
