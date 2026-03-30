# User Personas

This document defines the primary and secondary personas for the Eczema Tracker app. These personas inform UX decisions, feature prioritization, content tone, and interaction patterns throughout the application.

---

## Primary Persona: Markéta (The Mother)

### Demographics
- **Age:** 28–35
- **Location:** Czech Republic (urban or suburban)
- **Language:** Czech (native)
- **Device:** iPhone (primary), occasionally iPad at home
- **Tech comfort:** Moderate — uses smartphone daily, comfortable with apps, but not a power user

### Situation
Markéta is a first-time mother with a 6-week-old baby diagnosed with atopic eczema. Her pediatrician recommended an elimination diet to identify potential triggers passed through breast milk. She's exclusively breastfeeding and highly motivated to find what's causing her baby's skin flare-ups.

### Goals
1. **Track what she eliminates** — Know which foods are currently removed from her diet
2. **See if it's working** — Correlate dietary changes with her baby's skin condition over time
3. **Share with pediatrician** — Provide clear, organized data at appointments
4. **Not forget anything** — Capture meals and observations before sleep deprivation erases them

### Context of Use
- **When:** During or right after meals, during night feeds, waiting at pediatrician
- **Where:** Kitchen, nursery, pediatrician waiting room, bedroom (night feeds)
- **Physical state:** Often holding baby with one hand, frequently tired, sometimes stressed
- **Lighting:** Variable — bright kitchen, dim nursery at 3am
- **Time available:** 30 seconds to 2 minutes per interaction

### Pain Points
- Forgetting what she ate yesterday (sleep deprivation)
- Losing track of which foods are currently eliminated
- Not knowing if elimination is actually helping
- Feeling overwhelmed by conflicting dietary advice
- Difficulty explaining the timeline to the pediatrician

### Behaviors & Preferences
- **Quick entry over completeness** — Would rather log 80% fast than 100% slowly
- **Visual over textual** — Prefers icons and colors to reading text
- **Forgiving UI** — Needs undo, not "are you sure?" dialogs that require reading
- **Familiar patterns** — iOS native feel, no learning curve
- **Czech language** — Medical terms in Czech, not Latin or English

### Frustration Triggers
- Multi-step flows that can't be interrupted (baby cries mid-entry)
- Tiny touch targets while holding baby
- Losing data after accidental back swipe
- Loading spinners when she just needs to log quickly
- Complex date pickers when "today" or "yesterday" covers 95% of cases

### Success Metrics (from her perspective)
- "I can log a meal in under 10 seconds"
- "I can see at a glance what I'm currently not eating"
- "The pediatrician was impressed with my tracking"
- "I finally found the trigger!"

---

## Secondary Persona: Tomáš (The Father)

### Demographics
- **Age:** 30–38
- **Device:** Android phone (Samsung/Pixel)
- **Tech comfort:** Higher than Markéta — comfortable with technical apps

### Situation
Tomáš shares parenting responsibilities. He doesn't breastfeed but supports Markéta by helping track the baby's condition, taking photos, and occasionally logging meals when Markéta describes what she ate.

### Goals
1. **Support Markéta** — Help with tracking when she's exhausted
2. **Take photos** — Capture skin/stool photos with consistent framing
3. **Understand the data** — See what's being tracked without asking Markéta to explain

### Context of Use
- **When:** Evening diaper changes, weekend mornings, pediatrician appointments
- **Frequency:** Less often than Markéta (2–3x per week vs. daily)

### Behaviors & Preferences
- **Contributor, not manager** — Adds data, doesn't configure settings
- **Quick orientation** — Needs to understand app state without prior context
- **Photo-focused** — His main contribution is taking consistent photos

### Key Differences from Markéta
- Uses app less frequently — needs clear affordances, no hidden features
- More comfortable with technical UI but less invested in food tracking details
- Primary value: photo capture and viewing trends

---

## Tertiary Persona: Dr. Nováková (The Pediatrician)

### Demographics
- **Age:** 45–55
- **Tech comfort:** Low to moderate — uses EMR systems but not enthusiastic about apps
- **Time per patient:** 10–15 minutes

### Situation
Dr. Nováková sees many babies with atopic eczema. She advises elimination diets but rarely gets useful data back — parents forget what they ate or can't articulate the timeline. She's skeptical of apps but would love clear, printable summaries.

### Goals
1. **Quick assessment** — See the elimination timeline and skin progression at a glance
2. **Trustworthy data** — Know the data is systematic, not cherry-picked
3. **Printable/shareable** — Something she can add to the patient file

### Context of Use
- **When:** During appointment, while parent holds screaming baby
- **Format:** PDF on her computer or shared Google Doc link
- **Time:** 30 seconds to scan, 2 minutes to review in detail

### What She Needs from the Export
- Timeline of eliminations and reintroductions with dates
- Photo comparison showing skin progression
- Clear trend indicator: improving / stable / worsening
- AI analysis summary (as a second opinion, not diagnosis)
- Correlation suggestions (which foods correlate with flares)

### What She Does NOT Need
- App access or login
- Raw data dumps
- English text or technical jargon

---

## Persona Comparison Matrix

| Attribute | Markéta (Mother) | Tomáš (Father) | Dr. Nováková |
|-----------|------------------|----------------|--------------|
| App access | Full | Full (shared account) | None (export only) |
| Frequency | Daily, multiple times | 2–3x per week | At appointments |
| Primary task | Food logging | Photo capture | Review export |
| Time per session | 30 sec – 2 min | 1–3 min | 30 sec – 2 min |
| One-handed use | Essential | Sometimes | N/A |
| Tech comfort | Moderate | Higher | Low |
| Emotional state | Often stressed/tired | Supportive | Professional |

---

## UX Implications

These personas drive the following design decisions:

### For Markéta (Primary)
- **One-handed operation**: All primary actions reachable in thumb zone
- **Speed over precision**: "Today" and "Yesterday" shortcuts, copy-from-yesterday
- **Forgiving interactions**: Undo instead of confirm dialogs, auto-save
- **Glanceable status**: Color-coded dots, emoji icons, minimal text
- **Interruption-friendly**: State preserved if app backgrounded mid-entry
- **Offline-first**: Works without network, syncs later

### For Tomáš (Secondary)
- **Clear current state**: Dashboard shows what's eliminated without explanation
- **Photo guidance**: Ghost overlay for consistent framing
- **Attribution**: Show who logged what ("Přidala M" / "Přidal T")
- **Same account**: No separate login, shared encryption passphrase

### For Dr. Nováková (Tertiary)
- **Export-first**: PDF/Google Doc designed for printing and filing
- **Summary at top**: Key findings before detailed data
- **Czech throughout**: No English, no technical jargon
- **Photo progression**: Side-by-side comparison with dates
- **Professional appearance**: Clean layout suitable for medical records

---

## Anti-Personas (Who This App Is NOT For)

### The Data Scientist Parent
- Wants raw CSV exports, custom date ranges, statistical analysis
- We provide trends, not analytics tools

### The Multi-Child Family
- Managing elimination diets for multiple children simultaneously
- This app tracks one child only (by design)

### The Non-Breastfeeding Parent
- Formula-fed babies don't benefit from maternal elimination diet tracking
- The app assumes breastfeeding context

### The Casual Tracker
- Wants to occasionally note "baby seemed fussy after I had coffee"
- This app is for systematic elimination protocol, not casual journaling

---

## Revision History

| Date | Change |
|------|--------|
| 2026-03-30 | Initial version |
