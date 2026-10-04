/**
 * MonoBlocks — components/TableResource/registry.unit.test.tsx
 *
 * Runtime tests for the builtin renderers, `defineColumnTypes`, the
 * registry provider, and the `useColumnTypeRegistry` hook. A test-only
 * `testonly` augmentation proves custom registrations merge over builtins;
 * no production code uses it.
 */
import { render, screen } from '@testing-library/react';

import { ColumnTypeRegistryProvider } from './ColumnTypeRegistryProvider';
import { builtinColumnTypes, defineColumnTypes } from './registry';
import { useColumnTypeRegistry } from './useColumnTypeRegistry';

import type { ReactNode } from 'react';

declare module './types/column' {
  interface ColumnTypeMap {
    testonly: { prefix?: string };
  }
}

function RegistryProbe(): ReactNode {
  const registry = useColumnTypeRegistry();
  const testOnly = registry.testonly?.render('value', {});
  const text = registry.text?.render('  padded  ', { trim: true });
  return (
    <div data-testid="probe">
      <span data-testid="testonly">{testOnly}</span>
      <span data-testid="text">{text}</span>
    </div>
  );
}

describe('builtinColumnTypes', () => {
  it('renders text with and without trimming', () => {
    const { render: renderText } = builtinColumnTypes.text;
    expect(renderText('  padded  ', { trim: true })).toBe('padded');
    expect(renderText('  padded  ', {})).toBe('  padded  ');
    expect(renderText(12, {})).toBe('12');
  });

  it('renders numbers with locale and fixed fraction digits', () => {
    const { render: renderNumber } = builtinColumnTypes.number;
    expect(renderNumber(1234.5, { locale: 'en-US', decimalPlaces: 2 })).toBe('1,234.50');
    expect(renderNumber(42, {})).toBe('42');
    expect(renderNumber('abc', {})).toBe('abc');
  });

  it('renders dates via format tokens', () => {
    const { render: renderDate } = builtinColumnTypes.date;
    const date = new Date(2026, 0, 5, 9, 8, 7);
    expect(renderDate(date, { format: 'YYYY-MM-DD HH:mm:ss' })).toBe('2026-01-05 09:08:07');
    expect(renderDate(date, { format: 'M/D/YY' })).toBe('1/5/26');
    expect(renderDate(date.getTime(), { format: 'YYYY' })).toBe('2026');
  });

  it('renders an em dash for unusable dates', () => {
    const { render: renderDate } = builtinColumnTypes.date;
    expect(renderDate('garbage', { format: 'YYYY' })).toBe('—');
    expect(renderDate({ nope: true }, { format: 'YYYY' })).toBe('—');
    expect(renderDate(new Date('invalid'), { format: 'YYYY' })).toBe('—');
  });

  it('renders booleans with default and custom labels', () => {
    const { render: renderBoolean } = builtinColumnTypes.boolean;
    expect(renderBoolean(true, {})).toBe('Yes');
    expect(renderBoolean(0, {})).toBe('No');
    expect(renderBoolean('x', { trueLabel: 'Open', falseLabel: 'Closed' })).toBe('Open');
    expect(renderBoolean('', { trueLabel: 'Open', falseLabel: 'Closed' })).toBe('Closed');
  });
});

describe('defineColumnTypes', () => {
  it('returns its argument unchanged', () => {
    const registration = defineColumnTypes({
      testonly: { render: (value, options) => `${options.prefix ?? 'T:'}${String(value)}` },
    });
    expect(defineColumnTypes(registration)).toBe(registration);
  });
});

describe('ColumnTypeRegistryProvider', () => {
  it('provides merged registrations to descendants', () => {
    const types = defineColumnTypes({
      testonly: { render: (value, options) => `${options.prefix ?? 'T:'}${String(value)}` },
    });
    render(
      <ColumnTypeRegistryProvider types={types}>
        <RegistryProbe />
      </ColumnTypeRegistryProvider>,
    );
    expect(screen.getByTestId('testonly').textContent).toBe('T:value');
    expect(screen.getByTestId('text').textContent).toBe('padded');
  });

  it('falls back to builtins when no provider is present', () => {
    render(<RegistryProbe />);
    expect(screen.getByTestId('testonly').textContent).toBe('');
    expect(screen.getByTestId('text').textContent).toBe('padded');
  });
});
