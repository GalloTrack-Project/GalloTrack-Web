export function focusValidationField(targetId: string) {
  if (typeof document === 'undefined') return;
  const field = document.getElementById(targetId);
  if (!field) return;
  if (typeof field.scrollIntoView === 'function') {
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  field.focus({ preventScroll: true });
}
