# Prototype — merged skin-state + photo logging

THROWAWAY. Delete this folder once the design is chosen and folded into the real
`/skin` route + `SkinObservation` model.

Run: `just dev` → `http://localhost:5174/skin-prototype?variant=A` (B, C via floating bar / ← →).

## Question being answered
1. How should the merged "skin state + photo" logging flow look?
2. Which status input wins — 4-point relative delta vs 5-point absolute severity?
3. How is camera vs gallery presented? (final OS-sheet behaviour only confirmable on a phone)

## Locked before prototype (grilling session)
- Hard merge (A): photo cannot exist without an observation.
- Storage A2: keep `photos` table, `observationId` becomes a REQUIRED FK. Atomic write.
- Deferred save: photos held in memory as previews, committed with the observation. Camera usable before status; Save requires status. Abandon = zero trace.
- Multiple observations per day, each editable (reopen to add photo / change status).

## Still open — decide from the prototype
- **Status scale** (4-pt relative vs 5-pt absolute). NOTE the discovered divergence:
  DESIGN.md week-strip dots + photo markers assume a 5-pt ABSOLUTE severity
  (klidná..akutní), but today's model is a 4-pt RELATIVE delta. Recommendation in
  session was 5-pt absolute (photo is an absolute snapshot; composes into trends for
  the v1.1 insights engine; fixes the latent design mismatch). User chose to decide
  it visually here.
- **Form structure** + **photo button presentation**.

## Variants
- **A** — 5-pt absolute severity as a vertical ladder; single OS-picker photo button (no `capture` attr → OS offers Take Photo / Library / Files).
- **B** — photo-hero at top with TWO explicit buttons (Vyfotit `capture=environment` / Z galerie); 4-pt relative chips below.
- **C** — iOS-style photo grid with a `＋` tile (single OS picker); 5-pt absolute as a compact segmented bar.

Shared at the bottom of every variant: the merged DAY CARD (read side) — one
observation block carrying severity dot + label + time + its photos + notes,
multiple moments per day.

## ROUND 2 — granularity (current variants)
Reframe: the PHOTO carries visual detail for free; structured fields exist to be
machine-QUERYABLE by the insights engine. Question = which facets earn a tap.
- **A** — minimal: severity (1 tap) + photo + note. Lean on the photo. Fast path 1 tap.
- **B** — severity + itch/sleep (2 required taps = clinical daily core) + collapsible
  "+ oblasti / poznámka" (region chips + note). RECOMMENDED middle ground.
- **C** — regional: pick body regions, each gets its own severity inline. Spatial
  resolution; more taps; risk of inconsistent logging.

## ROUND 3 — regional input mechanism (current variants)
Direction locked: regional (per body part) beats single global state.
- **A** — body map silhouette (front+back). Tap a zone, taps cycle klid→akutní (color deepens). Spatial, no "unselected" limbo.
- **B** — region list. Tap to mark affected -> 5-pt bar + per-region photo ("foto této oblasti").
- **C** — region grid. Compact tiles, tap cycles 3 levels (mírné/střední/silné). Coarsest + fastest.
Regions: Tváře, Vlasová část, Krk, Břicho, Záda, Paže, Loketní jamky, Podkolení, Nohy.

## LOCKED
- Photo button: single "Přidat fotku" -> OS sheet (take photo / file / gallery). Two-button variant dead.
- Regional replaces global severity; day overall severity = derived (max region).
- Every region defaults to "bez ekzému" (clear). Unmarked = explicitly clear, not unknown.
- Renamed: Trup -> Břicho; added Záda. Read-side day-card preview removed from prototype.

## ROUND 4 — per-region photo attachment (current variants)
Grid chosen (3-level, tap-cycles severity, default calm). Tap is spent on severity,
so photo needs another path. Three solutions:
- **A** — per-tile 📷 badge: tile cycles severity; affected tile shows corner badge -> photo bound to THAT region. One photo -> one region. Small tap target.
- **B** — photo-first tagging: one global "Přidat fotku"; after capture, tag which affected regions it shows. ONE photo -> MANY regions. Keeps fast tap-cycle. Tagging optional (untagged = observation-level photo). RECOMMENDED.
- **C** — tap opens region sheet (severity + photo + note per zone). Richest per-region, cleanest model, but loses fast tap-to-cycle (every change = open/close sheet).

## ROUND 5 — guided one-region-at-a-time flow (current variants)
Rejected dense grid + badges. Intent: select region -> state + photo -> next region.
- **A** — scope-first stepper: pick all affected regions, then full-screen step through each (severity + photo + note), progress "2 ze 3", Další/Uložit. Best focus + photo room; best when many regions; two-phase, hides other regions.
- **B** — add-as-you-go: "+ Přidat oblast" -> pick -> inline card (severity+photo+note) -> "+ Přidat další". One screen, all added regions visible/editable, least ceremony for 1-3 regions. RECOMMENDED.
- **C** — inline auto-accordion: chips select, each expands in sequence. Closest to earlier rejected list.

## ROUND 6 — smart photo→region tagging on the grid (current)
Requirement: photos must carry a region tag (fed to vision/recommendation model).
Optimization: grid declares affected regions at capture; candidates = ONLY affected.
- 1 affected region -> auto-tag silently.
- many affected -> light picker, candidates = affected only.
- Photos attach to affected regions (severity-first: mark, then shoot). Vision model +
  candidate list is the backstop for any untagged photo.
Two takes:
- **A** — tag AFTER capture: thumb shows region chip; auto if 1, pick (affected only) if many. RECOMMENDED (don't gate camera behind a question).
- **B** — tag AT capture: pick region first (if >1) then shoot; tag baked in, no untagged thumbs.

## ROUND 7 — active-region flow (CHOSEN direction)
Tap region -> ACTIVE (bordeaux border). Active drives contextual "Přidat fotku · <region>".
Photo added -> shown with × to delete. One active at a time; logged regions show severity
color, no bordeaux. Re-select logged region -> add more photos (existing stay).
Severity set via 3 buttons in active panel (tap = select, NOT cycle).
Colors: mírné=yellow #D9A82E, střední=orange #C97027, silné=red #B84444.

Open sub-question: photo-button FORMAT (3 prototyped):
- A — full bordeaux button. Bold, but 2nd wine fill competes with Save (DESIGN.md "one wine fill/screen").
- B — dashed outline + icon, keeps "· <region>" label. Matches card-empty-cta pattern. RECOMMENDED.
- C — "+" tile in photo row. Most compact, but drops the region label (weakens explicit tagging).

## ROUND 8 — FINAL flow (corrected)
- Severity logged by TAPPING tiles (no severity-button section).
- Tap rule: tap INACTIVE region -> activate (init mírné if calm, else keep level);
  tap ACTIVE region -> cycle mírné→střední→silné→klid. Re-select logged region keeps level (for photos).
- Active = bordeaux border. Logged-inactive = severity color border. Calm = hairline.
- Contextual photo button for active region, DASHED style (must differ from solid-wine Save).
- Photos have ×. Re-select adds more. Colors mírné=yellow/střední=orange/silné=red.

## ROUND 9 — refinements (all applied + verified)
- Cycle fixed: (level+1)%4 -> mírné→střední→silné→klidné (full ring).
- Photo button: white bg, bordeaux border, NO icon, "Přidat fotku · <region>".
- Photo area: no wrapper background, no area title.
- Each photo: region title before it + × delete. Tap photo -> lightbox enlarge.
- Region counts as logged if level>0 OR has photo (so klidné+photo still saves).

## ROUND 10 — global photo gallery + revised tap rule (CHOSEN)
Two changes: photo placement collapses to one global gallery; tap rule splits activation
from severity-init.

Tap rule (REVISES round 9):
- Tap INACTIVE region -> activate ONLY. Level unchanged. (No more auto-init mírné.)
- Tap ACTIVE region -> cycle 0→1→2→3→0 (klidné→mírné→střední→silné→klidné, full ring).
- Active region never auto-deactivates; new active = whichever was tapped last.
- Cost: +1 tap per severity-marked region. Accepted to enable klidné+foto naturally
  (activate region, leave klidné, add photo).

Global gallery (REPLACES per-active inline photos):
- All photos render below the contextual photo button, not inside active panel.
- Chronological insertion order (mixed regions). 3 thumbs per row, ~96px square.
- Region title wraps below thumb in small font (10px). × delete top-right of thumb.
- Tap thumb -> lightbox.
- Vanishes when empty.

Lightbox:
- × button top-right + tap-backdrop. Both close. × stops propagation.

Per-tile photo cue:
- DROPPED. No `· N📷` badge. Klidné+foto tile is visually identical to never-touched
  klidné. Photo presence is discovered in the gallery via the region label under thumb.
- Rationale: keep grid focused on severity; gallery handles photo accounting.

Logged rule UNCHANGED: `level > 0 OR photoCount > 0`. Klidné+foto still saves.

Open item from this round, parked: when multiple-observations-per-day lands, the gallery
must scope to THIS observation only (not all today's photos).

## FINALIZED so far
- Active-region grid; bordeaux active border; severity colors yellow/orange/red.
- Tap rule (round 10): tap inactive = activate only; tap active = cycle full ring.
- White+bordeaux photo button, contextual to active region.
- GLOBAL chronological gallery, 3-per-row, 96px thumbs, region title wrapped below,
  × delete, tap-to-enlarge.
- Lightbox with × top-right + backdrop tap.
- One free-text `Poznámka (nepovinné)` textarea per observation (below gallery, above Save).

## OPEN / NEXT
- Itch/sleep facet? (raised earlier, parked)
- Status scale 4pt-relative vs absolute — superseded by per-region severity; confirm relative delta is fully dropped.
- Multiple observations per day + edit (locked earlier) — how day-card renders regional data.
- Then: fold into real /skin route + SkinObservation model (regions[], per-region photos w/ FK), update CONTEXT/UBIQUITOUS_LANGUAGE/ADR.
- Winning granularity (A / B / C / mix):
- Status scale (4pt-relative vs 5pt-absolute):
- Itch/sleep facet in or out:
- Region facet: required / optional / out:
- Mix notes:
