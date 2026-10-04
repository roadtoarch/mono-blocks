/**
 * MonoBlocks — components/TableResource/EditableCellRenderer.tsx
 *
 * Chunk 9: the in-cell editor (MRT-style, no pencil icon). Enter or blur
 * saves the input's text; Escape cancels; a rejected `editing.onSave` keeps
 * the editor open with Carbon's invalid styling; `pending` disables the
 * input while the save is in flight.
 */
import { TextInput } from '@carbon/react';
import { useEffect, useId, useRef } from 'react';

import { seedCellText } from './cellEditing';

import type { KeyboardEvent, ReactElement } from 'react';

export interface EditableCellRendererProps {
  /** Accessible label for the input (`Edit <header>`). */
  labelText: string;
  /** Raw cell value seeding the input (never the display formatting). */
  value: unknown;
  /** Disables the input while the save is in flight. */
  pending: boolean;
  /** Marks the input invalid after a rejected save. */
  error: boolean;
  /** Reports the entered text for saving. */
  onCommit: (text: string) => void;
  /** Closes the editor without saving. */
  onCancel: () => void;
}

const ERROR_TEXT = 'Could not save changes.';

export function EditableCellRenderer({
  labelText,
  value,
  pending,
  error,
  onCommit,
  onCancel,
}: EditableCellRendererProps): ReactElement {
  // Uncontrolled input: typing stays local (no per-keystroke re-renders).
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  // MRT-style: entering edit mode focuses the input and selects the
  // existing text so typing replaces it.
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = (): void => {
    onCommit(inputRef.current === null ? '' : inputRef.current.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!pending) {
        commit();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (!pending) {
        onCancel();
      }
    }
  };

  const handleBlur = (): void => {
    if (!pending) {
      commit();
    }
  };

  return (
    <div onKeyDown={handleKeyDown}>
      <TextInput
        ref={inputRef}
        id={inputId}
        labelText={labelText}
        hideLabel
        size="sm"
        defaultValue={seedCellText(value)}
        disabled={pending}
        invalid={error}
        invalidText={ERROR_TEXT}
        onBlur={handleBlur}
      />
    </div>
  );
}
