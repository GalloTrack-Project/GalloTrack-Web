# QA: native browser autocomplete suppression

## Why this exists

Chrome and Edge can show their own saved-form-history popup over a custom dropdown.
The app now uses the shared `ComboboxInput` / `AutocompleteCombobox` components with
`autocomplete="off"`, no `list` attribute, no `<datalist>`, unique `id`/`name` values,
and password-manager ignore attributes. Unit tests verify the markup and keyboard
behavior only; they cannot reproduce the browser's native saved-value popup.

## Inputs to check in Chrome and Edge

### Registration form (`/profiling?tab=form`)

- Genetic Strain (`gt-genetic-strain`)
- Feather Color (`gt-feather-color`)
- Trait (`gt-behavior-trait`)
- Leg Color (`gt-leg-color`)
- Sire (`gt-encode-sire`)
- Dam (`gt-encode-dam`)

### Edit chicken modal

- Genetic Strain (`gt-edit-genetic-strain`)
- Feather Color (`gt-edit-feather-color`)
- Trait (`gt-edit-behavior-trait`)
- Leg Color (`gt-edit-leg-color`)
- Sire (`gt-edit-sire`)
- Dam (`gt-edit-dam`)

### Match Logs form

- Arena Location Hub (`gt-arena-location`)

### Purity composition breed picker

- The breed picker is a native `<select>`, not a free-text field. Confirm that no
  saved text popup appears and that the breed list still opens normally.

## Checklist for each input

1. Type one of these values, save the form, then reopen it:
   `Honey Lemon`, `Thunder Hatch`, `N/A`, `Lemon`, `Hatch`.
2. Focus the field again and confirm only the app's custom listbox is visible.
   No dark browser history popup may appear over it.
3. Type a partial value and verify the custom listbox filters.
4. Use ArrowDown / ArrowUp, Enter, Escape, and Tab. Confirm the expected option is
   selected, the list closes, and focus moves normally.
5. Select an option with the mouse. Confirm the value is saved exactly as before.
6. Check light and dark mode.
7. Switch to Tagalog and Hiligaynon and confirm labels and help text are intact
   (no corrupted `?` characters).
8. Check the Genetic Strain area for duplicate actions. The only breed actions should
   be one `+ Add breed` button beside the label and the `Manage breeds` footer row
   inside the dropdown. `+ Add another breed` belongs only to the purity composition
   editor. Confirm the shared combobox still suppresses native suggestions when the
   genetic-strain dropdown is opened through this new breed UI.

## Fallback

If Chrome still shows saved form history after these checks, change only the free-text
combobox inputs to `autoComplete="new-password"` in `ComboboxInput`. Never apply that
fallback to real password fields.
