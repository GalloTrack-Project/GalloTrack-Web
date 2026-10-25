/**
 * Single source of truth for UI labels related to breeding roles, breeding stock,
 * and retired fighters across Chicken Registry and Chicken Inventory.
 */

export const BREEDING_ROLE_LABELS = {
  none: 'Not a breeder',
  breeder: 'Breeder',
  material: 'Breeding Stock',
} as const;

export const BREEDING_ROLE_FIELD_LABEL = 'Breeding Role (manual)';

export const MARK_AS_BREEDING_STOCK_BUTTON = 'Mark as Breeding Stock';
export const SET_BACK_TO_ACTIVE_BUTTON = 'Set back to Active';
export const REMOVE_BREEDING_STOCK_BUTTON = 'Remove Breeding Stock Designation';

export const RETIRED_FIGHTER_LABEL = 'Retired Fighter';
export const RETIRED_FIGHTER_TOOLTIP = 'Fought in recorded matches and is now used for breeding.';

export const SIRE_MATERIAL_MOVED_MESSAGE =
  'Sire Material has moved. Breeding males are under Cocks, and offspring kept for breeding are under Breeding Stock.';
