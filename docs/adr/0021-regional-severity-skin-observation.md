# 0021 — Per-region severity is the skin observation primitive

**Status:** Accepted
**Date:** 2026-06-22
**Amended:** 2026-06-29 — Klidné is positive evidence; every save witnesses all nine regions. Folds in the former ADR-0022. See "Amendment — klidné as positive evidence" below.
**Amended:** 2026-06-30 — Day-card rendering: `SkinObservationCard` reads observations as a per-region chip timeline (PR #381 / #385), not the stub "overall-severity dot + label" sketched in the original Decision. See "Amendment — day-card chip rendering" below.
**Amended:** 2026-06-30 — Observations are editable and deletable. Edits preserve `id` and `createdAt` (the witnessing moment is immutable); the port grows to `save` / `update` / `remove` / `listByDate`. See "Amendment — edit and delete preserve identity" below.

## Context

`/skin` was a single whole-body verdict — `status: improved | unchanged | worsened | new-lesions` — that the mother picked once per day and saved alongside an optional note and an immediate-save photo. The verdict was a *relative delta*: "did things change since last time?" That shape conflated three things the protocol actually wants to separate:

1. **Where** the eczema is (cheeks vs elbow folds vs no flare at all).
2. **How bad** it is *now*, on an absolute scale she can compare across days without remembering yesterday's record.
3. **Whether** there is a photographic baseline to look back at.

The redesign prototype (`docs/design/redesign-prototype.html`) reframes the screen as a 3×3 region grid with four absolute severity levels (klidné / mírné / střední / silné). Tapping an inactive region only activates it (so a calm region tapped by mistake stays calm); tapping the active region cycles its level. Photos move out of the save flow into a deferred slice. *(A throwaway Svelte prototype at `src/routes/skin-prototype/+page.svelte` was committed in PR #359 and deleted once the real `/skin` route was authored against this ADR.)*

The wire-up forces decisions:

- The per-region body shape is wider than the prior status enum: nine regions × four levels = 36 slot states the old `status` cannot encode.
- An overall severity for the day is still useful (week strip dot, day card stub, evaluation recap), but storing it duplicates information already in the regions array and lets the two diverge.
- Photos are out-of-scope this slice but in-scope next slice. Splitting persistence into "save observation now, save photos later" doubles round trips and creates an awkward partial-save state if the network were ever involved (it isn't in v1, but the shape leaks).
- The nine-region union is a domain-language concept — Czech display strings on the records would couple persistence to UI copy and break ADR-0014.

## Decision

The skin observation primitive is **a set of per-region severities, on a four-step absolute scale, captured atomically with any photos taken in the same session**.

### Domain shape

```ts
type RegionId =
  | 'face' | 'scalp' | 'neck'
  | 'belly' | 'back' | 'arms'
  | 'elbow-folds' | 'knee-folds' | 'legs';

type RegionLevel = 0 | 1 | 2 | 3;          // klidné / mírné / střední / silné

type SkinRegionRecord = { id: RegionId; level: RegionLevel };

type SkinObservation = {
  id: string;
  date: string;        // ISO date
  createdAt: string;   // ISO datetime
  regions: SkinRegionRecord[];
  notes?: string;
};
```

- **Nine regions, four levels.** Frozen for v1. New regions or finer levels require a follow-up ADR — the strings layer's `satisfies Record<RegionId, ...>` makes additions fail `bunx tsc --noEmit` until labels exist.
- **`RegionId` is canonical, kebab-case, English-rooted.** Czech display labels live in `src/lib/strings/skin-regions.ts`, severity hex tokens in `src/lib/config/skin-regions.ts` (the strings + config split per ADR-0014).
- **Klidné is the explicit default**, not an "unknown" sentinel. A region the mother never touched is calm, not missing. The grid initialises every region to level 0 and the cycle wraps back through 0 — there is no "clear" verb.
- **Tap-to-activate is separate from tap-to-cycle.** Tapping an inactive region only selects it (bordeaux border); tapping the already-selected region cycles its severity. This prevents accidental severity bumps on regions the mother is just visually scanning.
- **Logged is `level > 0`.** The Uložit gate counts `regions.filter(r => r.level > 0)`. A region whose level the mother cycled all the way back to klidné is not logged. (When photos arrive in the next slice, "logged" widens to `level > 0 OR photo for region`.)
- **Day-overall severity is `max(regions)`, derived at every read site.** Never persisted. The week strip, day card, and evaluation recap all read it via `overallSeverity()` from `$lib/domain/models`.

### Persistence

`SkinObservationRepository.save` takes both the observation and any photos captured in the same session, and writes them in a single Dexie `'rw'` transaction over `skin_observations` and `photos`:

```ts
save(observation: SkinObservation, photos: SkinPhoto[]): Promise<Result<void, string>>;
```

Slice 1 (this issue, #361) always passes an empty photos array. The signature is shaped now so consumers don't migrate twice when slice 2 lights up the photos arm.

The Dexie schema bumps to `version(7)`. Same indexes as v6, with an `upgrade(tx)` hook that clears `skin_observations` so the old `status`-shaped rows never reach the new readers — pre-launch wipe per ADR-0012/0016, consistent with prior v2 / v3 / v4 / v6 bumps.

### Out of scope this slice

- **Photos.** Persistence shape ready, UI flow lives in the next slice (parent #358).
- **Per-region drill-in cards.** `SkinObservationCard` and `SkinPhotoCard` recompile against the new shape with a stub summary (overall-severity dot + label). Their full redesign is a separate slice. *(Shipped: see "Amendment — day-card chip rendering" below.)*
- **Reintroduction-allergen banner on `/skin`.** Removed; the mother already has the reintroduction context on `/day` and `/meal`. If it returns, it returns as a separate observation-cards slice.

## Consequences

- The old `status: 'improved' | 'unchanged' | 'worsened' | 'new-lesions'` field is gone from `SkinObservation` and from every consumer (`buildPhaseRecap`, `SkinObservationCard`, `/program` "skin reactions" snippet, `/evaluation` recap). The `skinOutcomes` aggregate strings (`'× zlepšení'` etc.) are replaced by severity-tier suffixes (`'× klidné'`, `'× mírné'`, `'× střední'`, `'× silné'`).
- `EczemaCheck.svelte` and its tests are deleted. `eczemaCheck.*` strings, the `reactionBannerLabel(...)` helper, and the `saveAssessment` / `addPhoto` action labels are removed with it; `/skin` is the only consumer.
- `/skin` re-authors against the prototype: nine-tile region grid, optional note, gated Uložit, return-to navigation. No reintroduction-allergen pill.
- ADR-0004 stands — causation is still derived. The change here is the *shape* of the observation primitive (regions, not status); causal reasoning over the new shape is unchanged.
- Migration path for severity granularity: the strings layer keys `RegionLevel` numerically, so adding a fifth level becomes a domain-model change (`type RegionLevel = 0 | 1 | 2 | 3 | 4`), a strings change, a Dexie bump, and a `satisfies` failure that pins every consumer to update.

## References

- Issue #361 — feat(skin): per-region severity observation (no photos)
- Parent #358 — feat(skin): regional severity logging with deferred photos
- PR #359 — committed prototype (deleted once `/skin` was authored)
- PR #381 / #385 — `SkinObservationCard` chip-timeline redesign (see amendment below)
- Issue #379 — fix(skin): klidné regions should persist as positive evidence (folded in as amendment below; previously ADR-0022)
- ADR-0004 — Causation is derived, not recorded (amended for the model cut)
- ADR-0012 — Allergen status lifecycle (pre-launch wipe pattern)
- ADR-0014 — Presentation strings and domain keys (strings + config split)
- ADR-0016 — Verdict drives schedule, not status (paired evaluation/observation domains)

---

## Amendment — klidné as positive evidence (2026-06-29)

*Folds in the former ADR-0022. Issue #379 / PR #382.*

### Context

The original Decision above kept the legacy "logged means `level > 0`" gate. `/skin` only persisted regions the mother had cycled past klidné; the other regions were dropped from the saved `SkinObservation.regions` array.

That model leaks. Absence in the array could mean either:

- the region is currently calm (klidné) — but the mother *did* check it, or
- the mother never looked at this region today.

For an elimination-protocol tracker — where the question is *did anything change today vs yesterday* — "checked, looked clear" and "didn't check" must be distinguishable. They are different evidence:

- A region disappearing across days could mean improvement (was logged at level > 0 yesterday, klidné now) or oversight (mother forgot to check). The original shape made these indistinguishable.
- Pattern detection (planned for v1.1, [ADR-0007](0007-v1-scope.md)) cannot see negative evidence — it can only count flares, not calm baselines.
- The Uložit CTA's "save N specific areas" framing contradicted the mother's mental model ("all nine were checked"). The label was hot-fixed to a constant `Uložit pozorování` in the /skin visual-alignment work, but the underlying model still treated klidné as absence.

The symptom that surfaced this: when the CTA label read `Uložit stav · 1 oblast`, the mother could reasonably believe only the bumped region would be saved while the other eight klidné regions would be discarded. That was literally true under the original persistence shape.

### Decision (amendment)

**A `SkinObservation` is a witness that the mother checked all nine regions on that day. Every saved observation persists all nine `SkinRegionRecord`s, with level 0 (klidné) for any region she did not explicitly bump.** Uložit is enabled the moment `/skin` loads — no engagement gesture required, because the act of opening the page and pressing save is itself the witness.

#### Persistence shape

```ts
// On save, regardless of tap history:
const regions: SkinRegionRecord[] = REGION_IDS.map((id) => ({
  id,
  level: levels[id], // defaults to 0
}));
```

`regions.length === 9` after every save. A bumped region carries its level (1–3); every other region carries 0. The Dexie schema is unchanged; the only change is that more rows in the array are now level 0.

#### `canSave` gate

Removed. `canSave = true` always — the save button is enabled on page load and stays enabled. The only disable condition is the in-flight `saving` flag (double-submit guard).

### Consequences (amendment)

- **Pattern detection (v1.1) can read negative evidence.** A region appearing across consecutive days at level 0 is data, not noise.
- **Storage cost is negligible.** A `SkinRegionRecord` is `{ id: string; level: 0|1|2|3 }`. Nine per observation vs the previous variable count is ~200 extra bytes per day. Across a year that is ~73 KB — within IndexedDB norms.
- **Backward compatibility is one-way safe.** Reading pre-#379 observations (with `regions.length < 9`) still works: `overallSeverity` falls back to 0 for absent regions, and the strings/config layers treat absence the same as klidné. Writes always produce the new shape; the reader needs no migration.
- **The `loggedRegions` derivation is dead.** It was only used by the old `canSave` gate. Removed from `/skin/+page.svelte`.
- **The "klidné region + photo enables Uložit" behaviour from the original Decision is gone.** It was a workaround for the old gate — once `canSave` is always true, the photo path is no longer a gate, just a side effect.
- **Test asymmetry with severity > 0:** the bumped-region test still asserts `toContainEqual({ id: 'face', level: 1 })`; the all-klidné test asserts every record has `level === 0`. Both must hold; the persistence shape is identical, only the levels differ.

---

## Amendment — day-card chip rendering (2026-06-30)

*Resolves the "stub summary" placeholder in the original Decision. PR #381 + PR #385.*

### Context

The original Decision deferred `SkinObservationCard`'s redesign to a later slice and shipped a stub (overall-severity dot + label + record count). That stub leaked the same "row-overall severity" framing this ADR rejected for `/skin`: an observation with `tváře=silné, břicho=mírné` rendered `● Silné`, which a reader correctly understood to mean *"silné applies to both regions"* — a domain leak (severity is regional, not row-level).

### Decision (amendment)

**`SkinObservationCard` reads each observation as a timeline row with one chip per bumped region, each chip tinted by its own severity. No row-overall label.** A klidné observation (zero bumped regions) renders a single neutral "Vše klidné" chip in the level-0 token, so the row stays in the same chip-language as bumped rows rather than dropping back to a dot+label idiom. Notes live in an italic third line below the chips.

The day-card header drops the "N záznam(y/ů)" record count — the chip cluster already conveys multiplicity.

The empty state ("no observation today") still distinguishes itself: it renders a muted prefix plus a CTA link to `/skin?date=…&returnTo=/day/…`.

### Consequences (amendment)

- **`overallSeverity()` survives** as a derived read-helper for sites that legitimately need a single-value collapse: the `/program` phase-recap dot per dose day, the phase-recap severity-bucket counts, and the "possible cause" threshold on a reintroduction phase. The `SkinObservationCard` on `/day` no longer calls it.
- **Severity gradient on chips is calibrated as a non-linear alpha staircase:** `warning/15` (mírné) → `severity-4/45` (střední) → `danger/60` (silné). The earlier uniform `/15` ramp washed warm-family hues together at chip size; the louder upper stops give "střední vs silné" a perceptible gap on the small chips and the larger `/skin` region tiles alike. Encoded in `src/lib/config/skin-regions.ts`.
- **Chip language is uniform across observation states.** A bumped observation, an all-klidné observation, and a single-region observation all render as one or more chips on the same row geometry — no special-case dot or label for any of them.
- **Day-card semantics sharpen vs the prior stub.** Empty state means "she didn't visit /skin today"; "Vše klidné" chip means "she visited and everything was calm"; per-region chips mean "she visited and these specific regions are bumped." The three states are now visually distinct in their content, not just by accident.

---

## Amendment — edit and delete preserve identity (2026-06-30)

*Brings observations into parity with meals for edit and delete affordances.*

### Context

The original Decision said "save observation now, save photos later" and shaped the port as a single `save(observation, photos)`. There was no read-for-edit path, no update path, no delete path. Compose was the only verb. The day card's `SkinObservationCard` rendered each observation as an inert `<div>` row — a row of evidence, not a tap target.

That asymmetry with `/meal` (which has supported edit and delete since PRD #265) became the live question once the chip-timeline amendment landed: each row now visibly *is* a discrete record, but the mother had no way to reach it. The shape of the verb she needed — edit a specific persisted row — also forced a question the original Decision had not answered: **what is the identity of an observation?** The id is the only primary key; `createdAt` is what the day card sorts on and shows ("9:12"); regions and notes are content. If an edit can change `createdAt`, the row's position on the timeline is mutable — and the timeline stops being a faithful record of *when the skin was witnessed*.

### Decision (amendment)

**An observation's `id` and `createdAt` are immutable across edit, delete, and undo-after-delete.** `createdAt` represents the witnessing moment; the mother editing a typo in the note tomorrow does not retroactively change *when* she looked at the skin. Edits overwrite `regions`, `notes`, and the photo set (additions and removals committed atomically with the observation row in a single Dexie `'rw'` transaction). Delete is a hard delete cascading to all `SkinPhoto` rows for that observation. Undo-after-delete restores the same record — same `id`, same `createdAt`, same photo blobs — via the in-memory discard buffer.

The `SkinObservationRepository` port grows to four methods, speaking domain verbs:

```ts
type SkinObservationRepository = {
  save(observation, addPhotos): Promise<Result<void, string>>;       // compose
  update(observation, { addPhotos, removePhotoIds }): Promise<Result<void, string>>;  // edit
  remove(id): Promise<Result<void, string>>;                         // delete (cascades to photos)
  listByDate(date): Promise<Result<SkinObservation[], string>>;
};
```

The port surface is intentionally not collapsed into an overloaded `save(observation, addPhotos, removePhotoIds = [])`. Two reasons: (1) the port is a domain interface, not a Dexie pass-through — it should speak compose/edit/delete, not upsert/bulk-write; (2) `update`'s named-options object resists positional-argument confusion at call sites.

The `/skin` route handles compose and edit in the same file, discriminated by the presence of `?id=` in the URL — same shape as `/meal?type=...&date=...`. A missing or unknown `id` bounces to `returnTo` rather than silently falling through to compose, to prevent stale links from creating duplicate observations. Edit mode disables Uložit on a clean edit (state equals load snapshot, including staged photo adds/removals); compose mode keeps `canSave = true` per the klidné amendment.

### Consequences (amendment)

- **The day card's observation rows become tap targets** (link to `/skin?date={date}&id={obs.id}&returnTo=/day/{date}`). `SkinObservationCard` changes wrapper element from `<div>` to `<a>`; chip layout is unchanged.
- **Photo edit is staged on `/skin`, committed on Uložit.** A persisted photo marked for deletion is greyed with an Undo X in the gallery; the Dexie `bulkDelete` only fires on Uložit. Back-out drops the staging.
- **Discard-buffer parity with `/meal`.** Both arms ship: dirty-edit back-out preserves staged state for re-entry; post-delete undo captures the observation + photo blobs before the Dexie remove and rehydrates on re-entry. The buffer keys observations by `id` (not by a slot like meals), reflecting that observations have no natural key beyond their uuid.
- **`ConfirmSheet` is extracted as `lib/components/ConfirmSheet.svelte`** in this slice and used by both `/skin` and `/meal`. The CLAUDE.md "second use triggers extraction" rule applies — `/meal`'s inline bottom sheet migrates to it.
- **Pattern detection (v1.1) treats edits as point-in-time corrections, not new evidence.** Because `createdAt` is preserved, an edit does not look like "two observations close in time" — it looks like the same observation, refined. This matters for the future insight engine's de-duplication.
- **Photo blobs survive in memory for the undo buffer's lifetime.** A deleted observation with three photos holds those Blobs until the buffer is overwritten or the session ends. Memory ceiling is bounded by "one observation's photos at a time" — single-device single-session, so no concurrent-buffer hazard.
