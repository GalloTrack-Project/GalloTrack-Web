export type StatusTone = 'neutral' | 'pending' | 'warning' | 'success' | 'error';

export type ValidationFieldKey = 'name' | 'strain' | 'gender' | 'birthdate';

export type ValidationFieldItem = {
  key: ValidationFieldKey;
  label: string;
  complete: boolean;
  /** DOM id of the field that should receive focus when the item is clicked. */
  targetId: string;
};
