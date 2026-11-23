/**
 * Single source of truth for app stacking layers.
 *
 * content < action bars < page dropdowns/popovers < modals < toasts
 */
export const Z_LAYERS = {
  content: 0,
  actionBar: 30,
  dropdown: 50,
  modal: 60,
  modalPopover: 70,
  toast: 100,
} as const;

export type ZLayer = keyof typeof Z_LAYERS;
