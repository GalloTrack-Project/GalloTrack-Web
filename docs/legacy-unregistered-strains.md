# Legacy unregistered strains report

Read-only snapshot of the `strains` and `fowl` tables. No stored chicken or breed
values were modified.

## Snapshot summary

- Chickens scanned: 67
- Registered breeds (`strains` where `deleted_at` is null): 0
- Distinct unregistered strain values: 13

## Values currently used by chickens but not registered

| Strain value | Chickens |
| --- | ---: |
| Lemon | 16 |
| Hatch | 15 |
| Sweater | 10 |
| hatch - roundhead | 7 |
| Roundhead | 6 |
| Whitehackle | 4 |
| Kelso | 3 |
| Cowan Roundhead | 1 |
| Florry Gray | 1 |
| Hatch Kelso | 1 |
| kelso | 1 |
| Lieper Hatch | 1 |
| Pure Hatch | 1 |

Note: `Kelso` and `kelso` are listed separately because the stored values differ in
case. They should be treated as the same breed when deciding which legacy values to
register.

## Excluded strain pickers

These are outside the registered-breed picker and were not changed:

- Match Logs / Arena opponent breed field (`opponent_breed`) - free-text opponent data.
- Registry breed filter (`RegistryFilterBar`) - filter only, not a stored strain picker.
- Purity composition breed rows - already use the registered `availableBreeds` list.
