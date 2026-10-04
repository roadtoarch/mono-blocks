/**
 * MonoBlocks — components/TableResource/viewState.unit.test.ts
 *
 * Matrix over `deriveViewState`: status-driven except for `success`, which
 * consults the row count.
 */
import { deriveViewState } from './viewState';

describe('deriveViewState', () => {
  it('maps initial to the initial view regardless of row count', () => {
    expect(deriveViewState('initial', 0)).toEqual({ kind: 'initial' });
    expect(deriveViewState('initial', 3)).toEqual({ kind: 'initial' });
  });

  it('maps loading to the loading view regardless of row count', () => {
    expect(deriveViewState('loading', 0)).toEqual({ kind: 'loading' });
    expect(deriveViewState('loading', 3)).toEqual({ kind: 'loading' });
  });

  it('maps error to the error view regardless of row count', () => {
    expect(deriveViewState('error', 0)).toEqual({ kind: 'error' });
    expect(deriveViewState('error', 3)).toEqual({ kind: 'error' });
  });

  it('maps success with zero rows to empty', () => {
    expect(deriveViewState('success', 0)).toEqual({ kind: 'empty' });
  });

  it('maps success with rows to data', () => {
    expect(deriveViewState('success', 1)).toEqual({ kind: 'data' });
    expect(deriveViewState('success', 5)).toEqual({ kind: 'data' });
  });
});
