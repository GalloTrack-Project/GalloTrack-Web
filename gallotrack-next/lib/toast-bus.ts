/**
 * Module-level toast bus.
 *
 * `showToastMessage` is called from ~60 places, most of them inside provider
 * components in lib/contexts/ — and those are plain components, not consumers,
 * so they cannot call the `useToast()` hook. This bus is the seam: the mounted
 * ToastProvider registers its dispatcher here, and non-component code calls
 * `toast()` / `toastMessage()` without knowing React exists.
 *
 * If nothing is registered the calls are silently dropped, which is the correct
 * behaviour for a module that runs before the provider mounts.
 */

export type ToastVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastHandler = (input: ToastInput) => void;

let handler: ToastHandler | null = null;

export function registerToastHandler(next: ToastHandler | null) {
  handler = next;
}

export function toast(input: ToastInput): void {
  handler?.(input);
}

/**
 * Compatibility shim for the legacy `showToastMessage(message, type)` signature,
 * so migrating a call site is a rename rather than a rewrite. Legacy 'error'
 * maps to the `danger` variant; everything else maps straight through.
 */
export function toastMessage(
  message: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'success',
): void {
  toast({ title: message, variant: type === 'error' ? 'danger' : type });
}
