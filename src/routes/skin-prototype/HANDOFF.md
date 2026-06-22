# Handoff — skin-state + photo logging grilling

**Purpose of next session:** continue the grilling/prototyping for the merged skin-state + photo logging flow, decide remaining open items, then fold the chosen design into the real `/skin` route + domain model.

**Branch:** `feat/issue-332-skin-status-evaluation`
**Prototype location:** `src/routes/skin-prototype/` (throwaway — delete on fold-in)
**Run:** `just dev` → `http://localhost:5173/skin-prototype` (also reachable from a phone on LAN at the dev server's network URL — verify OS camera/gallery sheet there)

## Read these first (do not duplicate)

- `src/routes/skin-prototype/NOTES.md` — full decision log, all 9 grilling rounds, locked vs open. **Authoritative.**
- `src/routes/skin-prototype/+page.svelte` — current prototype state (final round flow).
- `CLAUDE.md` — repo rules. Note: design-system rules in `DESIGN.md`, vocabulary in `UBIQUITOUS_LANGUAGE.md` + `CONTEXT.md`, ADRs in `docs/adr/`.
- `DESIGN.md` — "one wine fill per screen" rule drove the photo-button styling decision; respect it on any new variant.
- `src/lib/domain/models.ts` — current `SkinObservation` (4-pt relative delta) + `SkinPhoto` (no FK to observation today). Both will need to change.
- `src/lib/components/EczemaCheck.svelte` — existing skin-check component being replaced; has `capture="environment"` (camera-only) and immediate-save photo behavior the new flow drops.

## Where the design landed (locked, do not relitigate)

See `NOTES.md` "FINALIZED so far" + Round 7-9 sections. Quick recap so a fresh agent does not reopen settled decisions:

- Hard merge: photo cannot exist without an observation. `photos.observationId` becomes a required FK. Atomic deferred save (photos held in memory until the observation is saved).
- Single "Přidat fotku" button → OS-native sheet (no `capture` attr). Two-button camera/gallery split is **dead**.
- **Regional severity** replaces global single-state. 9 regions: Tváře, Vlasová část, Krk, Břicho, Záda, Ruce, Loketní jamky, Podkolení, Nohy.
- 3 levels per region: mírné (yellow `#D9A82E`) / střední (orange `#C97027`) / silné (red `#B84444`). Default = klidné = explicitly clear (NOT unknown).
- Day overall severity = derived `max(regions)`.
- **Active-region interaction:** tap inactive → activate (init mírné if calm, else keep level). Tap active → cycle mírné→střední→silné→klidné via `(level + 1) % 4` (the bug `((level % 3) + 1) % 4` never reaches 0 — keep the fixed version).
- Active = bordeaux border. Logged-inactive = severity color border. Calm = hairline.
- Photo tagging is implicit: photos attach to the active region; button label "Přidat fotku · {region}" makes the binding visible. This is the answer for the downstream vision/recommendation model — do **not** add a separate tagging step.
- Photo button: white bg + bordeaux border, NO icon. Differentiates from solid-wine Save (DESIGN.md).
- Per-photo UI: region title above thumb + × delete button + tap-to-enlarge lightbox. No wrapper bg, no area title.
- Region counts as "logged" if `level > 0` OR has photo (klidné + photo still saves).
- One free-text `Poznámka (nepovinné)` textarea per observation, below photos, above Save. **Per-observation, not per-region.**

## Open / next session work

In priority order:

1. **Itch + sleep facet** — raised earlier and parked. Decide: required / optional / out. Domain context: clinical daily-core minimum is severity + itch + sleep. Trade-off is taps vs. machine-queryable signal for the v1.1 insights engine. Prototype if not obvious.
2. **Multiple observations per day + edit flow** — locked in principle (re-open observation to add photo / change severity), but UI not yet designed.
3. **Read-side day card** — how does the day overall card render the regional data? (severity dot + label + time + photos was the v1 model; with regions it needs to compress 9 regions into a glanceable summary.)
4. **Confirm the relative-delta model is dropped** — `SkinObservation.status` (`'improved'|'unchanged'|'worsened'|'new-lesions'`) is superseded by per-region severity. Verify nothing downstream depends on it before model changes.
5. **Verify on physical device** — OS camera/gallery sheet behavior is the only thing only confirmable on a phone, not desktop browser.
6. **Implementation phase** (after the above is decided):
   - Update `SkinObservation` to carry `regions: { name: RegionName, level: 0 | 1 | 2 | 3 }[]` and the per-observation `note`.
   - Update `SkinPhoto` with required `observationId` FK + `region` tag.
   - Add a `RegionName` type + Czech strings layer entry per `CLAUDE.md` conventions (`src/lib/strings/` keyed by domain id, `src/lib/config/` for visual tokens if needed).
   - Add an ADR for the regional severity model — it's a domain shape change, not just UI.
   - Update `CONTEXT.md` and `UBIQUITOUS_LANGUAGE.md` with `Region`, `RegionLevel`, "active region", "logged region".
   - Build the real `/skin` route from the prototype.
   - **Delete `src/routes/skin-prototype/`** once folded in.

## Suggested skills

- `/grill-with-docs` — for the open decisions above (itch/sleep, multi-observation edit flow, day-card rendering). The session that produced the locked decisions used this and worked well.
- `/prototype` — variants A/B/C inside `src/routes/skin-prototype/+page.svelte` for any open visual/interaction question. Stay in this throwaway route until decisions are locked.
- `/tdd` — for the domain model changes (regions array, FK on photos) once the design is locked. The model change touches multiple consumers.
- `/code-review` — before merging the implementation phase.
- `/run` or `/verify` — to launch the dev server and test on the LAN URL when something needs phone-side confirmation (camera/gallery sheet).

## State of the working tree at handoff

- Branch `feat/issue-332-skin-status-evaluation` ahead of `main` only by uncommitted changes.
- Untracked: `src/routes/skin-prototype/` (`+page.svelte`, `NOTES.md`, this file).
- Tracked deletion: `redesign-screenshot.png` (was older repo-root screenshot, removed alongside 22 grilling-round screenshots earlier in this session — none referenced anywhere).
- No commits made in the previous session. Nothing to push or revert.

## Don'ts

- Do not implement the regional severity model into the real `/skin` route or `lib/domain/models.ts` until the open items above are decided. The prototype is the source of truth right now.
- Do not add a second wine-fill button on any new variant — DESIGN.md "one wine fill per screen" is what made the photo button white+bordeaux.
- Do not reintroduce per-region tagging steps, body-map silhouette, region list, photo-first tagging, scope-first stepper, or add-as-you-go inline cards. All four were prototyped and rejected (see NOTES.md rounds 3-5).
- Do not commit Playwright screenshots into the repo root — earlier session accumulated 23, all deleted. If you need screenshots for design discussion, store them under `docs/design/skin-grilling/` and reference from NOTES.md.
- Do not merge the prototype into the real route without an ADR for the regional severity model.
