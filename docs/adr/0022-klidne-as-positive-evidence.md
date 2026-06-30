# ADR-0022 — Klidné is positive evidence; every save witnesses all nine regions

**Status:** Accepted
**Date:** 2026-06-29

## Context

ADR-0021 picked the per-region severity primitive but kept the legacy "logged means `level > 0`" gate. `/skin` only persisted regions the mother had cycled past klidné; the other regions were dropped from the saved `SkinObservation.regions` array.

That model leaks. Absence in the array could mean either:

- the region is currently calm (klidné) — but the mother *did* check it, or
- the mother never looked at this region today.

For an elimination-protocol tracker — where the question is *did anything change today vs yesterday* — "checked, looked clear" and "didn't check" must be distinguishable. They are different evidence:

- A region disappearing across days could mean improvement (was logged at level > 0 yesterday, klidné now) or oversight (mother forgot to check). The current shape makes these indistinguishable.
- Pattern detection (planned for v1.1, [ADR-0007](0007-v1-scope.md)) cannot see negative evidence — it can only count flares, not calm baselines.
- The Uložit CTA's "save N specific areas" framing contradicted the mother's mental model ("all nine were checked"). The label was hot-fixed to a constant `Uložit pozorování` in the /skin visual-alignment work, but the underlying model still treated klidné as absence.

The symptom that surfaced this: when the CTA label read `Uložit stav · 1 oblast`, the mother could reasonably believe only the bumped region would be saved while the other eight klidné regions would be discarded. That was literally true under the old persistence shape.

## Decision

**A `SkinObservation` is a witness that the mother checked all nine regions on that day. Every saved observation persists all nine `SkinRegionRecord`s, with level 0 (klidné) for any region she did not explicitly bump.** Uložit is enabled the moment `/skin` loads — no engagement gesture required, because the act of opening the page and pressing save is itself the witness.

### Persistence shape

```ts
// On save, regardless of tap history:
const regions: SkinRegionRecord[] = REGION_IDS.map((id) => ({
  id,
  level: levels[id], // defaults to 0
}));
```

`regions.length === 9` after every save. A bumped region carries its level (1–3); every other region carries 0. The Dexie schema is unchanged; the only change is that more rows in the array are now level 0.

### `canSave` gate

Removed. `canSave = true` always — the save button is enabled on page load and stays enabled. The only disable condition is the in-flight `saving` flag (double-submit guard).

### Day-view summary

The `SkinObservationCard` distinguishes:

- **No observation today** → empty-state copy ("Zatím není záznam pro dnešek.")
- **Observation: all klidné** → severity dot (klidné token) + label ("klidné") + record count

These were already visually distinct under the prior code, but only by happy accident. Tests now pin the distinction so a future refactor cannot collapse them.

## Consequences

- **Pattern detection (v1.1) can read negative evidence.** A region appearing across consecutive days at level 0 is data, not noise.
- **Day-card semantics sharpen.** Empty state means "she didn't visit /skin today"; klidné dot means "she visited and everything was calm." The two are no longer ambiguous.
- **Storage cost is negligible.** A `SkinRegionRecord` is `{ id: string; level: 0|1|2|3 }`. Nine per observation vs the previous variable count is ~200 extra bytes per day. Across a year that is ~73 KB — within IndexedDB norms.
- **Backward compatibility is one-way safe.** Reading pre-#379 observations (with `regions.length < 9`) still works: `overallSeverity` falls back to 0 for absent regions, and the strings/config layers treat absence the same as klidné. Writes always produce the new shape; the reader needs no migration.
- **The `loggedRegions` derivation is dead.** It was only used by the old `canSave` gate. Removed from `/skin/+page.svelte`.
- **The "klidné region + photo enables Uložit" behaviour from ADR-0021 is gone.** It was a workaround for the old gate — once `canSave` is always true, the photo path is no longer a gate, just a side effect.
- **Test asymmetry with severity > 0:** the bumped-region test still asserts `toContainEqual({ id: 'face', level: 1 })`; the all-klidné test asserts every record has `level === 0`. Both must hold; the persistence shape is identical, only the levels differ.

## References

- Issue #379 — fix(skin): klidné regions should persist as positive evidence
- [ADR-0007](0007-v1-scope.md) — v1 scope (Protocol Executor; pattern detection deferred to v1.1)
- [ADR-0014](0014-presentation-strings-and-domain-keys.md) — Presentation strings and domain keys
- [ADR-0021](0021-regional-severity-skin-observation.md) — Per-region severity is the skin observation primitive (superseded `canSave` rule)
