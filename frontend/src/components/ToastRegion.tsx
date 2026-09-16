/**
 * MonoBlocks — components/ToastRegion.tsx
 *
 * Renders the bottom-right toast notification region.
 * Auto-dismiss handled by the vanilla store; this component
 * just renders the current list and provides a close button.
 */
import { useCallback, useRef, useState } from 'react';

import type { ToastKind } from '@/stores/toast';

import { useToasts } from '@/hooks';

/** Map kind → icon description for accessibility. */
const KIND_LABEL: Record<ToastKind, string> = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Information',
};

interface ToastItemProps {
  id: string;
  kind: ToastKind;
  title: string;
  body?: string;
  onDismiss: (id: string) => void;
}

function ToastItem({ id, kind, title, body, onDismiss }: ToastItemProps) {
  const [exiting, setExiting] = useState(false);
  const dismissed = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    setExiting(true);
    // Allow exit animation before removal.
    setTimeout(() => {
      onDismiss(id);
    }, 250);
  }, [onDismiss, id]);

  return (
    <div
      className={`mb-toast mb-toast--${kind}${exiting ? ' is-exiting' : ''}`}
      role="alert"
      aria-label={KIND_LABEL[kind]}
    >
      <span className="mb-toast__icon" aria-hidden="true">
        ●
      </span>
      <div className="mb-toast__content">
        <span className="mb-toast__title">{title}</span>
        {body && <span>{body}</span>}
      </div>
      <button
        type="button"
        className="mb-toast__close"
        onClick={dismiss}
        aria-label={`Dismiss ${KIND_LABEL[kind]} notification`}
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Fixed bottom-right region that renders all active toasts.
 * Reads directly from the store via useToasts hook.
 */
export function ToastRegion() {
  const { toasts } = useToasts();

  const handleDismiss = useCallback((_id: string) => {
    // The vanilla store auto-dismisses non-error toasts after 4s.
    // Manual dismiss is handled inside ToastItem via exit animation.
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="mb-toast-region" aria-live="polite" aria-label="Notifications">
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          id={t.id}
          kind={t.kind}
          title={t.title}
          body={t.body}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
}
