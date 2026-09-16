/**
 * MonoBlocks — stores/toast.ts
 *
 * Toast notification system. Success/info/warning auto-dismiss after 4s;
 * error toasts are sticky until manually dismissed.
 */

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  body?: string;
}

let nextId = 0;
const listeners = new Set<() => void>();
let toasts: Toast[] = [];

function notify(): void {
  for (const fn of listeners) fn();
}

export function getToasts(): Toast[] {
  return toasts;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Show a toast notification.
 * @returns A dismiss function for imperative dismissal.
 */
export function toast(kind: ToastKind, title: string, body?: string): () => void {
  const id = String(++nextId);
  const entry: Toast = { id, kind, title, body };
  toasts = [...toasts, entry];
  notify();

  const dismiss = () => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  };

  if (kind !== 'error') {
    setTimeout(dismiss, 4000);
  }

  return dismiss;
}

/**
 * Manually dismiss a toast by id.
 */
export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}
