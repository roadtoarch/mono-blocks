/**
 * MonoBlocks — components/TableResource/TableResourceView.unit.test.tsx
 *
 * Chunk-3 integration: structure parity (headers, rows, keys, className/
 * align), cell precedence through the component, toolbar + headers in ALL
 * states, state colSpan, and zebra striping. Chunk 4 adds single-column
 * sorting behavior (cycle, sortKey reporting, inert defaults); chunk 5 adds
 * the Carbon pager (placement, 1-based reporting, unknown totals, chrome
 * kept in every view state); chunk 6 adds the config-gated "Edit columns"
 * menu, visibility toggling, reordering, and localStorage hydration; chunk 7
 * adds config-gated row expansion (spacer column, per-row toggle, lazy
 * panel content, widened colSpan); chunk 8 adds config-gated row actions
 * (trailing Actions header, per-row OverflowMenu, colSpan widening); chunk 9
 * adds config-gated inline editing (raw-value seed, Enter/Escape/blur,
 * pending lock, reject-error, no local echo).
 */
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TableResourceView } from './TableResourceView';

import type { TableResourceColumn, TableResourceProps } from './types';

// jsdom has no ResizeObserver; Carbon's OverflowMenu (the Edit columns
// trigger) constructs one on mount. Module scope so it lands before any test.
class ResizeObserverStub {
  observe(): void {
    // jsdom performs no layout; nothing to report.
  }
  unobserve(): void {
    // jsdom performs no layout; nothing to report.
  }
  disconnect(): void {
    // jsdom performs no layout; nothing to report.
  }
}

globalThis.ResizeObserver = ResizeObserverStub;

// jsdom reports zero-sized rects; Carbon's FloatingMenu keeps the menu body
// visibility:hidden until it measures a non-zero size, which also empties
// computed accessible names inside the menu.
Element.prototype.getBoundingClientRect = () => new DOMRect(0, 0, 100, 100);

interface Row {
  id: string;
  name: string;
  qty: number;
  when: string | null;
}

const rows: Row[] = [
  { id: 'r1', name: 'Alpha', qty: 1234.5, when: '2026-01-05' },
  { id: 'r2', name: 'Beta', qty: 2, when: null },
];

const columns: TableResourceColumn<Row>[] = [
  { key: 'name', header: <strong>Name</strong>, render: (row) => row.name },
  {
    key: 'qty',
    header: 'Qty',
    type: 'number',
    options: { locale: 'en-US', decimalPlaces: 2 },
    className: 'cds--mono',
    align: 'right',
  },
];

function renderView(overrides: Partial<TableResourceProps<Row>> = {}) {
  const props: TableResourceProps<Row> = {
    columns,
    rows,
    getRowId: (row) => row.id,
    status: 'success',
    ...overrides,
  };
  const view = render(<TableResourceView<Row> {...props} />);
  return {
    ...view,
    rerenderWith: (next: Partial<TableResourceProps<Row>> = {}) => {
      view.rerender(<TableResourceView<Row> {...props} {...next} />);
    },
  };
}

describe('TableResourceView (chunk 3)', () => {
  describe('structure', () => {
    it('renders one header per column with ReactNode content', () => {
      renderView();
      const headers = screen.getAllByRole('columnheader');
      expect(headers).toHaveLength(2);
      expect(within(headers[0]).getByText('Name').tagName).toBe('STRONG');
      expect(screen.getByRole('columnheader', { name: 'Qty' })).toBeTruthy();
    });

    it('renders one body row per data item, keyed via getRowId', () => {
      const getRowId = vi.fn((row: Row) => row.id);
      renderView({ getRowId });
      expect(getRowId).toHaveBeenNthCalledWith(1, rows[0], 0);
      expect(getRowId).toHaveBeenNthCalledWith(2, rows[1], 1);
      // header row + 2 body rows
      expect(screen.getAllByRole('row')).toHaveLength(3);
      expect(screen.getByText('Alpha')).toBeTruthy();
      expect(screen.getByText('Beta')).toBeTruthy();
    });

    it('applies the type renderer, className, and align to body cells', () => {
      const { container } = renderView();
      const qtyCell = screen.getByText('1,234.50').closest('td');
      expect(qtyCell?.className).toContain('cds--mono');
      expect(qtyCell?.getAttribute('style')).toContain('text-align: right');
      expect(container).toBeTruthy();
    });

    it('prefers render(row) over the type renderer on the same column', () => {
      renderView({
        columns: [
          {
            key: 'qty',
            header: 'Qty',
            type: 'number',
            options: { decimalPlaces: 2 },
            render: (row) => `custom:${row.name}`,
          },
        ],
      });
      expect(screen.getByText('custom:Alpha')).toBeTruthy();
      expect(screen.queryByText('1,234.50')).toBeNull();
    });

    it('renders nullish cell values as an em dash', () => {
      renderView({
        columns: [{ key: 'when', header: 'When' }],
        rows: [{ id: 'r1', name: 'A', qty: 1, when: null }],
      });
      expect(screen.getByText('—')).toBeTruthy();
    });

    it('enables zebra striping on the table', () => {
      const { container } = renderView();
      const table = container.querySelector('table');
      expect(table?.className).toContain('zebra');
    });
  });

  describe('toolbar and headers in ALL states', () => {
    const toolbar = <button type="button">Export</button>;
    const stateMatrix: { label: string; props: Partial<TableResourceProps<Row>> }[] = [
      { label: 'initial', props: { status: 'initial', rows: [] } },
      { label: 'loading', props: { status: 'loading', rows: [] } },
      { label: 'empty', props: { status: 'success', rows: [] } },
      {
        label: 'error',
        props: { status: 'error', rows: [], error: 'Boom' },
      },
    ];

    for (const { label, props } of stateMatrix) {
      it(`keeps headers and toolbar visible in the ${label} state`, () => {
        renderView({ toolbar, ...props });
        expect(screen.getAllByRole('columnheader')).toHaveLength(2);
        expect(screen.getByRole('button', { name: 'Export' })).toBeTruthy();
      });
    }

    it('renders state rows with colSpan equal to the column count', () => {
      renderView({ status: 'initial', rows: [] });
      expect(screen.getByText('Nothing to display yet.').getAttribute('colspan')).toBe('2');
    });

    it('omits the toolbar when not provided', () => {
      renderView();
      expect(screen.queryByRole('button', { name: 'Export' })).toBeNull();
    });
  });

  describe('state content', () => {
    it('renders empty defaults and the filtered variant', () => {
      const { unmount } = renderView({ rows: [] });
      expect(screen.getByText('No data available.')).toBeTruthy();
      unmount();
      renderView({ rows: [], hasActiveFilters: true });
      expect(screen.getByText('No results match the current filters.')).toBeTruthy();
    });

    it('lets emptyState override the default empty message', () => {
      renderView({ rows: [], emptyState: 'Nothing matches.' });
      expect(screen.getByText('Nothing matches.')).toBeTruthy();
      expect(screen.queryByText('No data available.')).toBeNull();
    });

    it('shows the loading skeleton with skeletonRowCount lines', () => {
      const { container } = renderView({ status: 'loading', rows: [], skeletonRowCount: 4 });
      expect(container.querySelectorAll('.cds--skeleton__text')).toHaveLength(4);
    });

    it('retries from the error state', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      renderView({ status: 'error', rows: [], error: 'Boom', onRetry });
      expect(screen.getByText('Boom')).toBeTruthy();
      await user.click(screen.getByRole('button', { name: 'Retry' }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('sorting (chunk 4)', () => {
    const sortableColumns: TableResourceColumn<Row>[] = [
      { key: 'name', header: 'Name', sortKey: 'full_name', render: (row) => row.name },
      { key: 'qty', header: 'Qty', sortKey: 'qty', render: (row) => String(row.qty) },
    ];

    it('is inert without a sorting config: no sort button, no aria-sort', () => {
      renderView({ columns: sortableColumns });
      const [nameHeader] = screen.getAllByRole('columnheader');
      expect(within(nameHeader).queryByRole('button')).toBeNull();
      expect(nameHeader.getAttribute('aria-sort')).toBeNull();
    });

    it('cycles asc → desc → cleared, reporting the sortKey each click', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderView({ columns: sortableColumns, sorting: { enabled: true, onChange } });
      const [nameHeader] = screen.getAllByRole('columnheader');
      const button = within(nameHeader).getByRole('button');

      await user.click(button);
      expect(onChange).toHaveBeenNthCalledWith(1, { key: 'full_name', direction: 'ASC' });
      expect(nameHeader.getAttribute('aria-sort')).toBe('ascending');

      await user.click(button);
      expect(onChange).toHaveBeenNthCalledWith(2, { key: 'full_name', direction: 'DESC' });
      expect(nameHeader.getAttribute('aria-sort')).toBe('descending');

      await user.click(button);
      expect(onChange).toHaveBeenNthCalledWith(3, null);
      expect(nameHeader.getAttribute('aria-sort')).toBe('none');
    });

    it('leaves columns without a sortKey unsortable and silent', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderView({
        columns: [
          { key: 'name', header: 'Name', sortKey: 'name', render: (row) => row.name },
          { key: 'qty', header: 'Qty', render: (row) => String(row.qty) },
        ],
        sorting: { enabled: true, onChange },
      });
      const [, qtyHeader] = screen.getAllByRole('columnheader');
      expect(within(qtyHeader).queryByRole('button')).toBeNull();
      await user.click(qtyHeader);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('mirrors a controlled sort onto header arrows at first render', () => {
      renderView({
        columns: sortableColumns,
        sorting: { enabled: true, sort: { key: 'full_name', direction: 'ASC' } },
      });
      const [nameHeader] = screen.getAllByRole('columnheader');
      expect(nameHeader.getAttribute('aria-sort')).toBe('ascending');
    });

    it('treats a null controlled sort as cleared', () => {
      renderView({ columns: sortableColumns, sorting: { enabled: true, sort: null } });
      const [nameHeader] = screen.getAllByRole('columnheader');
      expect(nameHeader.getAttribute('aria-sort')).toBe('none');
    });

    it('lights no header when the controlled key matches no column', () => {
      renderView({
        columns: sortableColumns,
        sorting: { enabled: true, sort: { key: 'unknown_field', direction: 'DESC' } },
      });
      for (const header of screen.getAllByRole('columnheader')) {
        expect(header.getAttribute('aria-sort')).toBe('none');
      }
    });

    it('follows a parent echo through rerenderWith', () => {
      const { rerenderWith } = renderView({
        columns: sortableColumns,
        sorting: { enabled: true, sort: { key: 'full_name', direction: 'ASC' } },
      });
      expect(screen.getAllByRole('columnheader')[0].getAttribute('aria-sort')).toBe('ascending');
      rerenderWith({ sorting: { enabled: true, sort: { key: 'full_name', direction: 'DESC' } } });
      expect(screen.getAllByRole('columnheader')[0].getAttribute('aria-sort')).toBe('descending');
    });

    it('derives controlled clicks from the echoed value', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderView({
        columns: sortableColumns,
        sorting: { enabled: true, sort: { key: 'full_name', direction: 'ASC' }, onChange },
      });
      const [nameHeader] = screen.getAllByRole('columnheader');
      await user.click(within(nameHeader).getByRole('button'));
      expect(onChange).toHaveBeenNthCalledWith(1, { key: 'full_name', direction: 'DESC' });
      // The arrow stays where the parent left it until it echoes back.
      expect(nameHeader.getAttribute('aria-sort')).toBe('ascending');
    });

    it('keeps sorting to a single column: sorting another resets the first', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderView({ columns: sortableColumns, sorting: { enabled: true, onChange } });
      const [nameHeader, qtyHeader] = screen.getAllByRole('columnheader');

      await user.click(within(nameHeader).getByRole('button'));
      expect(nameHeader.getAttribute('aria-sort')).toBe('ascending');

      await user.click(within(qtyHeader).getByRole('button'));
      expect(onChange).toHaveBeenLastCalledWith({ key: 'qty', direction: 'ASC' });
      expect(nameHeader.getAttribute('aria-sort')).toBe('none');
      expect(qtyHeader.getAttribute('aria-sort')).toBe('ascending');
    });

    it('still toggles header state when no onChange is supplied', async () => {
      const user = userEvent.setup();
      renderView({ columns: sortableColumns, sorting: { enabled: true } });
      const [nameHeader] = screen.getAllByRole('columnheader');
      await user.click(within(nameHeader).getByRole('button'));
      expect(nameHeader.getAttribute('aria-sort')).toBe('ascending');
    });

    it('is inert when sorting is explicitly disabled', () => {
      renderView({ columns: sortableColumns, sorting: { enabled: false } });
      const [nameHeader] = screen.getAllByRole('columnheader');
      expect(within(nameHeader).queryByRole('button')).toBeNull();
    });
  });

  describe('pagination (chunk 5)', () => {
    it('renders no pager without a pagination config', () => {
      renderView();
      expect(screen.queryByTestId('pagination')).toBeNull();
    });

    it('renders the pager after the table with the configured page and total', () => {
      renderView({ pagination: { page: 2, pageSize: 10, totalItems: 25 } });
      const table = screen.getByRole('table');
      const pager = screen.getByTestId('pagination');
      const follows = table.compareDocumentPosition(pager) & Node.DOCUMENT_POSITION_FOLLOWING;
      expect(follows).not.toBe(0);
      expect(within(pager).getByText('11–20 of 25 items')).toBeTruthy();
      expect(within(pager).getByText('of 3 pages')).toBeTruthy();
    });

    it('reports a 1-based page when the next button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderView({ pagination: { page: 2, pageSize: 10, totalItems: 25, onChange } });
      await user.click(screen.getByRole('button', { name: 'Next page' }));
      expect(onChange).toHaveBeenCalledWith(3, 10);
    });

    it('resets to page 1 and reports the new size when the size select changes', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderView({ pagination: { page: 2, pageSize: 10, totalItems: 50, onChange } });
      const pager = screen.getByTestId('pagination');
      await user.selectOptions(
        within(pager).getByRole('combobox', { name: 'Items per page:' }),
        '20',
      );
      expect(onChange).toHaveBeenCalledWith(1, 20);
    });

    it('keeps controls usable for a minimal config (no totalItems)', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderView({ pagination: { onChange } });
      const pager = screen.getByTestId('pagination');
      // No total → pagesUnknown: no page select, next stays enabled, page 1 shown.
      expect(within(pager).getAllByRole('combobox')).toHaveLength(1);
      expect(
        screen.getByRole('button', { name: 'Previous page' }).getAttribute('disabled'),
      ).not.toBeNull();
      expect(within(pager).getByText('page 1')).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Next page' }));
      expect(onChange).toHaveBeenCalledWith(2, 10);
    });

    it('keeps the pager in every view state', () => {
      const stateMatrix: Partial<TableResourceProps<Row>>[] = [
        { status: 'initial', rows: [] },
        { status: 'loading', rows: [] },
        { status: 'success', rows: [] },
        { status: 'error', rows: [], error: 'Boom' },
        { status: 'success' },
      ];

      for (const props of stateMatrix) {
        const { unmount } = renderView({
          pagination: { page: 1, pageSize: 10, totalItems: 5 },
          ...props,
        });
        expect(screen.getByTestId('pagination')).toBeTruthy();
        unmount();
      }
    });
  });

  describe('refetch affordance (batch A3)', () => {
    it('marks the table busy and shows the sweep rule while refetching', () => {
      renderView({ isRefetching: true });
      expect(screen.getByRole('table').getAttribute('aria-busy')).toBe('true');
      expect(document.querySelector('.mb-table-resource__fetching-rule')).not.toBeNull();
    });

    it('stays idle with no rule after a completed refetch', () => {
      renderView({ isRefetching: false });
      expect(screen.getByRole('table').getAttribute('aria-busy')).not.toBe('true');
      expect(document.querySelector('.mb-table-resource__fetching-rule')).toBeNull();
    });

    it('lets the loading skeleton win over the rule', () => {
      renderView({ status: 'loading', isRefetching: true });
      expect(screen.getByRole('table').getAttribute('aria-busy')).toBe('true');
      expect(document.querySelector('.mb-table-resource__fetching-rule')).toBeNull();
    });
  });

  describe('column visibility & ordering (chunk 6)', () => {
    beforeEach(() => {
      globalThis.localStorage.clear();
    });

    it('shows no Edit columns menu without visibility/order config', () => {
      renderView();
      expect(screen.queryByRole('button', { name: 'Edit columns' })).toBeNull();
    });

    it('unlocks the menu from persistKey alone, without a consumer toolbar', () => {
      renderView({ persistKey: 'gate-a' });
      expect(screen.getByRole('button', { name: 'Edit columns' })).toBeTruthy();
    });

    it('unlocks the menu from a controlled config prop', () => {
      renderView({ columnVisibility: {} });
      expect(screen.getByRole('button', { name: 'Edit columns' })).toBeTruthy();
    });

    it('leads each row with the reorder group before the checkbox (batch A3)', async () => {
      const user = userEvent.setup();
      renderView({ persistKey: 'order-a3' });
      await user.click(screen.getByRole('button', { name: 'Edit columns' }));
      const group = screen.getByRole('group', { name: 'Reorder Qty', hidden: true });
      expect(group.parentElement?.firstElementChild).toBe(group);
    });

    it('renders a labelled text trigger for columnMenu display icon+text (batch A3)', () => {
      renderView({ persistKey: 'menu-text', columnMenu: { display: 'icon+text' } });
      const trigger = screen.getByRole('button', { name: 'Edit columns' });
      expect(trigger.textContent).toContain('Edit columns');
    });

    it('marks the text-only trigger for chevron removal (batch A3)', () => {
      renderView({ persistKey: 'menu-text-only', columnMenu: { display: 'text-only' } });
      const trigger = screen.getByRole('button', { name: 'Edit columns' });
      // The modifier class rides on the trigger button itself.
      expect(trigger.closest('.mb-table-resource__menu-trigger--text-only')).not.toBeNull();
    });

    it('shows the labelled text+icon trigger by default (batch A4)', () => {
      renderView({ persistKey: 'menu-default-label' });
      const trigger = screen.getByRole('button', { name: 'Edit columns' });
      expect(trigger.textContent).toContain('Edit columns');
    });

    it('keeps the bare icon trigger when display is icon-only (batch A4)', () => {
      renderView({ persistKey: 'menu-icon-only', columnMenu: { display: 'icon-only' } });
      const trigger = screen.getByRole('button', { name: 'Edit columns' });
      expect(trigger.textContent).not.toContain('Edit columns');
    });

    it('unlocks the menu from initialState and applies the saved order', () => {
      renderView({ initialState: { columnOrder: ['qty', 'name'] } });
      expect(screen.getByRole('button', { name: 'Edit columns' })).toBeTruthy();
      const headers = screen.getAllByRole('columnheader');
      expect(headers[0].textContent).toBe('Qty');
      expect(headers[1].textContent).toBe('Name');
    });

    it('hides an unchecked column from headers and cells', async () => {
      const user = userEvent.setup();
      renderView({ persistKey: 'toggle-1' });
      await user.click(screen.getByRole('button', { name: 'Edit columns' }));
      await user.click(screen.getByRole('checkbox', { name: 'Toggle Qty column', hidden: true }));
      expect(screen.queryByRole('columnheader', { name: 'Qty' })).toBeNull();
      expect(screen.getByRole('columnheader', { name: 'Name' })).toBeTruthy();
      expect(screen.queryByText('1,234.50')).toBeNull();
      expect(screen.getByText('Alpha')).toBeTruthy();
    });

    it('re-shows a hidden column when its checkbox is checked again', async () => {
      const user = userEvent.setup();
      renderView({ persistKey: 'reshow' });
      await user.click(screen.getByRole('button', { name: 'Edit columns' }));
      await user.click(screen.getByRole('checkbox', { name: 'Toggle Qty column', hidden: true }));
      expect(screen.queryByRole('columnheader', { name: 'Qty' })).toBeNull();
      await user.click(screen.getByRole('checkbox', { name: 'Toggle Qty column', hidden: true }));
      expect(screen.getByRole('columnheader', { name: 'Qty' })).toBeTruthy();
    });

    it('moves a column with the up button and disables the edge buttons', async () => {
      const user = userEvent.setup();
      renderView({ persistKey: 'move-1' });
      await user.click(screen.getByRole('button', { name: 'Edit columns' }));
      await user.click(screen.getByRole('button', { name: 'Move Qty up', hidden: true }));
      const headers = screen.getAllByRole('columnheader');
      expect(headers[0].textContent).toBe('Qty');
      expect(headers[1].textContent).toBe('Name');
      expect(
        screen.getByRole('button', { name: 'Move Qty up', hidden: true }).getAttribute('disabled'),
      ).not.toBeNull();
      expect(
        screen
          .getByRole('button', { name: 'Move name down', hidden: true })
          .getAttribute('disabled'),
      ).not.toBeNull();
    });

    it('hydrates hidden columns from localStorage before first render', () => {
      globalThis.localStorage.setItem(
        'mb.table.hydrate.visibility',
        JSON.stringify({ qty: false }),
      );
      renderView({ persistKey: 'hydrate' });
      expect(screen.getAllByRole('columnheader')).toHaveLength(1);
      expect(screen.queryByRole('columnheader', { name: 'Qty' })).toBeNull();
    });

    it('hydrates saved order from localStorage', () => {
      globalThis.localStorage.setItem(
        'mb.table.order-hydrate.order',
        JSON.stringify(['qty', 'name']),
      );
      renderView({ persistKey: 'order-hydrate' });
      const headers = screen.getAllByRole('columnheader');
      expect(headers[0].textContent).toBe('Qty');
      expect(headers[1].textContent).toBe('Name');
    });

    it('persists a toggle under the mb.table.* visibility key', async () => {
      const user = userEvent.setup();
      renderView({ persistKey: 'save-1' });
      await user.click(screen.getByRole('button', { name: 'Edit columns' }));
      await user.click(screen.getByRole('checkbox', { name: 'Toggle Qty column', hidden: true }));
      expect(globalThis.localStorage.getItem('mb.table.save-1.visibility')).toBe(
        JSON.stringify({ qty: false }),
      );
    });

    it('pins visibility to the controlled columnVisibility prop', async () => {
      const user = userEvent.setup();
      renderView({ columnVisibility: { name: false } });
      expect(screen.queryByRole('columnheader', { name: 'Name' })).toBeNull();
      await user.click(screen.getByRole('button', { name: 'Edit columns' }));
      const checkbox = screen.getByRole<HTMLInputElement>('checkbox', {
        name: 'Toggle name column',
        hidden: true,
      });
      expect(checkbox.checked).toBe(false);
      // The user asks to show it; the controlled prop keeps it hidden.
      await user.click(checkbox);
      expect(checkbox.checked).toBe(false);
      expect(screen.queryByRole('columnheader', { name: 'Name' })).toBeNull();
    });

    it('keeps the state-row colSpan in sync with visible columns', () => {
      renderView({ columnVisibility: { qty: false }, status: 'initial', rows: [] });
      expect(screen.getByText('Nothing to display yet.').getAttribute('colspan')).toBe('1');
    });

    it('allows hiding every column in-session but never persists it', async () => {
      const user = userEvent.setup();
      renderView({ persistKey: 'guard-1' });
      await user.click(screen.getByRole('button', { name: 'Edit columns' }));
      await user.click(screen.getByRole('checkbox', { name: 'Toggle name column', hidden: true }));
      await user.click(screen.getByRole('checkbox', { name: 'Toggle Qty column', hidden: true }));
      expect(screen.queryAllByRole('columnheader')).toHaveLength(0);
      // Last stored snapshot stops at the partial state (qty's write is skipped).
      expect(globalThis.localStorage.getItem('mb.table.guard-1.visibility')).toBe(
        JSON.stringify({ name: false }),
      );
    });
  });

  describe('row expansion (chunk 7)', () => {
    const expansion = {
      ariaLabel: 'Expand details',
      render: (row: Row) => <span>Details for {row.name}</span>,
    };

    it('adds no spacer or expand control without an expansion config', () => {
      const { container } = renderView();
      expect(screen.getAllByRole('columnheader')).toHaveLength(2);
      expect(container.querySelector('th#expand')).toBeNull();
      expect(container.querySelectorAll('td.cds--table-expand')).toHaveLength(0);
    });

    it('adds the spacer header and one control per row with a config', () => {
      const { container } = renderView({ expansion });
      expect(screen.getAllByRole('columnheader')).toHaveLength(3);
      expect(container.querySelector('th#expand')).toBeTruthy();
      const buttons = screen.getAllByRole('button', { name: 'Expand details' });
      expect(buttons).toHaveLength(2);
      expect(buttons[0].getAttribute('aria-expanded')).toBe('false');
    });

    it('opens only the clicked row panel with lazy render(row, index) content', async () => {
      const user = userEvent.setup();
      const renderRow = vi.fn((row: Row) => <span>Details for {row.name}</span>);
      renderView({ expansion: { ariaLabel: 'Expand details', render: renderRow } });
      // Collapsed rows never call the consumer's render function.
      expect(renderRow).not.toHaveBeenCalled();
      await user.click(screen.getAllByRole('button', { name: 'Expand details' })[0]);
      expect(screen.getByText('Details for Alpha')).toBeTruthy();
      expect(screen.queryByText('Details for Beta')).toBeNull();
      expect(renderRow).toHaveBeenCalledTimes(1);
      expect(renderRow).toHaveBeenCalledWith(rows[0], 0);
      const button = screen.getAllByRole('button', { name: 'Expand details' })[0];
      expect(button.getAttribute('aria-expanded')).toBe('true');
      const panelCell = screen.getByText('Details for Alpha').closest('td');
      expect(panelCell?.getAttribute('colspan')).toBe('3');
    });

    it('collapses the panel on a second click', async () => {
      const user = userEvent.setup();
      renderView({ expansion });
      const button = () => screen.getAllByRole('button', { name: 'Expand details' })[0];
      await user.click(button());
      expect(screen.getByText('Details for Alpha')).toBeTruthy();
      await user.click(button());
      expect(screen.queryByText('Details for Alpha')).toBeNull();
      expect(button().getAttribute('aria-expanded')).toBe('false');
    });

    it('widens the state-row colSpan for the spacer column', () => {
      renderView({ expansion, status: 'initial', rows: [] });
      expect(screen.getByText('Nothing to display yet.').getAttribute('colspan')).toBe('3');
    });
  });

  describe('row actions (chunk 8)', () => {
    it('shows no actions column or menu without an actions config', () => {
      renderView();
      expect(screen.getAllByRole('columnheader')).toHaveLength(2);
      expect(screen.queryByRole('button', { name: 'Row actions' })).toBeNull();
      // header row + 2 data rows with 2 cells each
      expect(screen.getAllByRole('cell')).toHaveLength(4);
    });

    it('appends a default Actions header, a cell, and one menu per row', () => {
      renderView({ actions: { items: () => [{ id: 'edit', label: 'Edit', onClick: vi.fn() }] } });
      const headers = screen.getAllByRole('columnheader');
      expect(headers).toHaveLength(3);
      expect(headers[2].textContent).toBe('Actions');
      expect(screen.getAllByRole('cell')).toHaveLength(6);
      expect(screen.getAllByRole('button', { name: 'Row actions' })).toHaveLength(2);
    });

    it('honors a custom header node', () => {
      renderView({
        actions: {
          header: <span>Quick actions</span>,
          items: () => [{ id: 'edit', label: 'Edit', onClick: vi.fn() }],
        },
      });
      expect(screen.getByRole('columnheader', { name: 'Quick actions' })).toBeTruthy();
    });

    it('resolves items per row and invokes onClick with the row', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const items = vi.fn((row: Row) => [{ id: 'del', label: `Delete ${row.name}`, onClick }]);
      renderView({ actions: { items } });
      expect(items).toHaveBeenCalledWith(rows[0]);
      expect(items).toHaveBeenCalledWith(rows[1]);
      await user.click(screen.getAllByRole('button', { name: 'Row actions' })[0]);
      await user.click(screen.getByRole('menuitem', { name: 'Delete Alpha', hidden: true }));
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith(rows[0]);
      // Carbon closes the menu after an item click.
      expect(screen.queryByRole('menuitem', { name: 'Delete Alpha', hidden: true })).toBeNull();
    });

    it('keeps the cell but renders no menu when items is empty', () => {
      renderView({ actions: { items: () => [] } });
      expect(screen.getAllByRole('columnheader')).toHaveLength(3);
      expect(screen.getAllByRole('cell')).toHaveLength(6);
      expect(screen.queryByRole('button', { name: 'Row actions' })).toBeNull();
    });

    it('disables an item without firing its handler', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      renderView({
        actions: { items: () => [{ id: 'edit', label: 'Edit', onClick, disabled: true }] },
      });
      await user.click(screen.getAllByRole('button', { name: 'Row actions' })[0]);
      const item = screen.getByRole('menuitem', { name: 'Edit', hidden: true });
      expect(item.getAttribute('disabled')).not.toBeNull();
      await user.click(item);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('renders a leading icon alongside the item label', async () => {
      const user = userEvent.setup();
      renderView({
        actions: {
          items: () => [
            {
              id: 'archive',
              label: 'Archive',
              icon: <svg data-testid="action-icon" />,
              onClick: vi.fn(),
            },
          ],
        },
      });
      await user.click(screen.getAllByRole('button', { name: 'Row actions' })[0]);
      expect(screen.getByTestId('action-icon')).toBeTruthy();
      expect(screen.getByRole('menuitem', { name: 'Archive', hidden: true })).toBeTruthy();
    });

    it('widens the state-row colSpan for the actions column and keeps the header', () => {
      renderView({ actions: { items: () => [] }, status: 'initial', rows: [] });
      expect(screen.getByText('Nothing to display yet.').getAttribute('colspan')).toBe('3');
      expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeTruthy();
    });

    it('counts expansion and actions together in the colSpan', () => {
      renderView({
        actions: { items: () => [] },
        expansion: { ariaLabel: 'Expand details', render: (row) => row.name },
        status: 'initial',
        rows: [],
      });
      expect(screen.getByText('Nothing to display yet.').getAttribute('colspan')).toBe('4');
      // spacer + 2 data columns + Actions
      expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    });
  });

  describe('inline editing (chunk 9)', () => {
    const editableColumns = columns.map((column) =>
      column.key === 'qty' ? { ...column, editable: true } : column,
    );

    it('stays read-only without an editing config', async () => {
      const user = userEvent.setup();
      renderView({ columns: editableColumns });
      const cell = screen.getByRole('cell', { name: '1,234.50' });
      expect(cell.getAttribute('tabindex')).toBeNull();
      await user.click(cell);
      expect(screen.queryByRole('textbox')).toBeNull();
      expect(screen.getByRole('cell', { name: '1,234.50' })).toBeTruthy();
    });

    it('does not open an editor on a non-editable column', async () => {
      const user = userEvent.setup();
      renderView({ editing: { onSave: vi.fn() } });
      await user.click(screen.getByRole('cell', { name: '1,234.50' }));
      expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('opens with the raw value, saves on Enter, and never echoes locally', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      renderView({ columns: editableColumns, editing: { onSave } });
      await user.click(screen.getByRole('cell', { name: '1,234.50' }));
      const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Edit Qty' });
      // Raw runtime value seeds the input, never the display formatting.
      expect(input.value).toBe('1234.5');
      expect(screen.queryByText('1,234.50')).toBeNull();
      await user.clear(input);
      await user.type(input, '99');
      await user.keyboard('{Enter}');
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith('r1', { qty: 99 });
      expect(screen.queryByRole('textbox')).toBeNull();
      // rows still own truth — the cell re-renders the untouched data.
      expect(screen.getByRole('cell', { name: '1,234.50' })).toBeTruthy();
    });

    it('closes without saving on Escape', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      renderView({ columns: editableColumns, editing: { onSave } });
      await user.click(screen.getByRole('cell', { name: '1,234.50' }));
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('textbox')).toBeNull();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('commits the open cell on blur when a second cell opens', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      renderView({ columns: editableColumns, editing: { onSave } });
      await user.click(screen.getByRole('cell', { name: '1,234.50' }));
      await user.clear(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), '5');
      // mousedown blurs (saves) the first cell, then click opens the second.
      await user.click(screen.getByRole('cell', { name: '2.00' }));
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith('r1', { qty: 5 });
      expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('2');
    });

    it('locks editing while a save is pending', async () => {
      const user = userEvent.setup();
      let resolveSave: () => void = () => undefined;
      const onSave = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveSave = resolve;
          }),
      );
      renderView({ columns: editableColumns, editing: { onSave } });
      await user.click(screen.getByRole('cell', { name: '1,234.50' }));
      await user.keyboard('{Enter}');
      expect(onSave).toHaveBeenCalledTimes(1);
      const input = screen.getByRole<HTMLInputElement>('textbox');
      expect(input.disabled).toBe(true);
      // Single slot: no other cell may open while pending.
      await user.click(screen.getByRole('cell', { name: '2.00' }));
      expect(screen.getAllByRole('textbox')).toHaveLength(1);
      await act(async () => {
        resolveSave();
      });
      expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('keeps the editor open with an error when the save rejects', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn(() => Promise.reject(new Error('nope')));
      renderView({ columns: editableColumns, editing: { onSave } });
      await user.click(screen.getByRole('cell', { name: '1,234.50' }));
      await user.keyboard('{Enter}');
      expect(onSave).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBe('true');
      });
      expect(screen.getByText('Could not save changes.')).toBeTruthy();
      // Retrying stays possible: Enter saves again.
      await user.keyboard('{Enter}');
      expect(onSave).toHaveBeenCalledTimes(2);
    });

    it('opens the editor from the keyboard on an editable cell', async () => {
      const user = userEvent.setup();
      renderView({ columns: editableColumns, editing: { onSave: vi.fn() } });
      const cell = screen.getAllByRole('cell')[1];
      expect(cell.getAttribute('tabindex')).toBe('0');
      cell.focus();
      await user.keyboard('{Enter}');
      expect(screen.getByRole('textbox', { name: 'Edit Qty' })).toBeTruthy();
    });
  });
});
