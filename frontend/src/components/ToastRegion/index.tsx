/**
 * MonoBlocks — components/ToastRegion.tsx
 *
 * Renders the bottom-right toast notification region using
 * Carbon ToastNotification components.
 */
import { ToastNotification } from '@carbon/react';

import type { ToastKind } from '@/stores/toast';

import { useToasts } from '@/hooks';

const KIND_LABEL: Record<ToastKind, string> = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Information',
};

/**
 * Fixed bottom-right region that renders all active toasts.
 * Reads directly from the store via useToasts hook.
 */
export const ToastRegion = () => {
  const { toasts, dismiss } = useToasts();
  if (toasts.length === 0) return null;
  return (
    <div className="mb-toast-region" aria-live="polite" aria-label="Notifications">
      {toasts.map((t) => (
        <ToastNotification
          key={t.id}
          kind={t.kind}
          title={t.title}
          subtitle={t.body}
          aria-label={KIND_LABEL[t.kind]}
          onClose={() => {
            dismiss(t.id);
          }}
          lowContrast
        />
      ))}
    </div>
  );
};
