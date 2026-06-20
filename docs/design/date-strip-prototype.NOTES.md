# Date strip redesign — prototype verdict

**Question:** How should the `/day` date strip behave? Current sliding-window model
(selected day pinned rightmost, "Dnes" chip in the middle, greyed past dates that jump
back to today, no future) felt wrong. See `date-strip-prototype.html`.

## Decisions locked during grilling

1. **Continuous recent-days carousel**, not a 7-cell sliding window. Selected day
   highlights **in place** — the strip does not reshuffle around the selection.
   (Kills "selected always rightmost".)
2. **Recent-days focus.** Realistic navigation is today + last 2–3 days. Deep history
   jumps go to a separate date picker (TBD), not the everyday strip.
3. **Future = read-only preview.** Faded, tappable, shows the scheduled phase
   ("Naplánováno · Reintrodukce vejce začíná"). No meal/symptom entry on future days.
4. **Today = permanent ring marker** in its own slot (hollow dot when today not yet
   recorded). No more "Dnes" chip whenever a non-today day is selected.
5. **Header de-duplicated.** Eyebrow = weekday + date always; heading = `Dnes` when
   today, else the date (same format as `Dnes`). No doubled date.

## Open question (the variant switch)

Return-to-today affordance — prototype offers three:

- **A** — conditional "↩ Dnes" button, shown only when today is scrolled off-screen.
- **B** — no in-strip button; return-to-today is the existing **bottom-nav "Dnes" tab**.
- **C** — tap the header date to jump home.

**VERDICT: B.** The bottom-nav "Dnes" tab (`+layout.svelte`, `href="/day/{todayIso()}"`)
already returns to today from any day *and* goes muted when viewing a past date — it
already does both jobs the in-strip jump-button (A) was for. Adding A duplicates that
affordance ~2cm away; C is the same duplication via a hidden affordance. The strip keeps
only the permanent today-ring so today stays findable when in view. No return control of
its own.

## Resolved follow-ups

- **Interaction model = scroll-then-tap (decoupled) for v1.** Scrolling the strip only
  browses it; content does not change. Tapping a day commits → client-nav to `/day/[date]`
  → header + body swap reactively, strip does **not** reshuffle (selection in place). One
  navigation per intended tap, no mid-scroll Dexie query storm. (Prototype already does this.)
  - **Coupled scroll-to-select wanted in a later iteration** (user prefers it as UX): the
    centered day auto-selects and content follows the scroll. Deferred because it needs
    debounced selection + a query/nav strategy that doesn't thrash Dexie or history on every
    settle. Build decoupled first; revisit coupled once the strip mechanics are stable.
- **Deep-jump picker = none.** No separate calendar/picker. Going further back/forward =
  keep scrolling. Simplifies the surface.
- **Future preview = "Naplánováno" only** for now. Phase-name detail / "Den X / Y" deferred.
- **Days before `programStartDate` = greyed but selectable.** User may open a pre-start
  day (greyed styling), it just has no protocol context.
- **Scroll bounds = effectively none, BUT recommend a soft clamp.** User wants no hard
  bounds. Flagged risk: truly unbounded = building infinite empty cells (render cost) and
  meaningless scrolling into empty years. Recommendation when implementing: lazily render,
  and soft-clamp generously — back to a small buffer before `programStartDate`, forward to
  `estimatedEndDate` + buffer. Outside the protocol range there is no data and no schedule,
  so nothing is lost. **CONFIRMED: soft-clamp to protocol range** (back to a small buffer
  before `programStartDate`, forward to `estimatedEndDate` + buffer), lazily rendered.

## Cleanup when folded in

Delete `date-strip-prototype.html` + this file. Rewrite the winning behavior into
`src/lib/components/WeekStrip/` (rename likely — it's no longer a "week" strip) and
`src/routes/day/[date]/+page.svelte`, replacing `computeWeekStrip`. Production code
needs the timezone-safe local ISO (the prototype hit a `toISOString()` UTC off-by-one).
