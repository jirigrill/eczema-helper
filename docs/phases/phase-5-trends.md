# Phase 5: Trends & Correlation Dashboard

## Summary

This phase introduces a trends and correlation dashboard that visualizes eczema severity over time alongside food elimination periods. The dashboard combines manual severity ratings (1-5 from photo captures), AI-generated scores (redness, dryness, affected area from analysis results), and food tracking data into unified, interactive charts. A correlation detection algorithm identifies potential links between dietary changes and eczema improvements or flare-ups, presenting them as annotated callouts in Czech. Users can filter by date range and view per-child data. The goal is to surface patterns that help parents make informed decisions during the elimination diet process.

## Prerequisites

- **Phase 2** -- food tracking with elimination/reintroduction logging, providing the food timeline data.
- **Phase 3** -- photo diary with manual severity ratings (1-5) per photo, providing the severity data points.
- **Phase 4** -- AI analysis results with redness score (1-10), dryness score (1-10), and affected area percentage (0-100), providing the AI-derived metrics.
- All prerequisite data accessible via existing stores and API endpoints.

## Features

1. **Severity timeline chart** -- line chart plotting manual eczema severity ratings (1-5) and AI scores (redness, dryness) over time, with dual Y-axes where appropriate.
1b. **Stool quality timeline** -- chart showing stool color and consistency changes over time, with markers for mucus and blood presence. Color mapped to a visual scale (yellow = normal, green = concern, red/black = urgent).
2. **Food elimination timeline** -- horizontal bar chart showing elimination periods per food category as colored segments along a time axis.
3. **Combined overlay view** -- severity line chart with food elimination bars underneath, sharing the same time axis for visual correlation.
4. **Correlation detection** -- algorithm that identifies when severity improvements align with food eliminations (5-14 day window) or when worsening aligns with reintroductions (3-7 day window).
5. **Correlation callout annotations** -- highlighted markers on the combined chart with Czech text like "Vylouceni mlecnych vyrobku 5.3. -- zlepseni do 12.3."
6. **Date range filter** -- interactive date picker to narrow the dashboard view to a specific period.
7. **Per-child data** -- dashboard scoped to the selected child (child selector if multiple children tracked).
8. **Meal log context** -- alongside the food elimination timeline, display logged meals as contextual data points (what the mother actually ate on each day), giving a fuller picture without driving the correlation algorithm.

## Acceptance Criteria

- [ ] Severity timeline chart renders correctly with at least one data point.
- [ ] Manual severity (1-5) and AI redness score (1-10) are plotted on the same chart with clearly differentiated visual styles (color, line dash).
- [ ] AI dryness score is available as a toggleable series on the chart.
- [ ] Food elimination timeline shows colored horizontal bars for each eliminated food, with start and end dates.
- [ ] Each food category has a distinct, consistent color across views.
- [ ] Combined view aligns the severity chart and food timeline on the same horizontal time axis.
- [ ] Correlation callouts appear when the algorithm detects a suggestive pattern.
- [ ] Callout text is in Czech and includes the food name, elimination date, and improvement date.
- [ ] Date range filter updates all three charts simultaneously.
- [ ] Default date range is "last 30 days" with options for 7 days, 30 days, 90 days, and custom range.
- [ ] Dashboard loads within 3 seconds for 90 days of data on a mobile device.
- [ ] Charts are responsive and usable on mobile screens (minimum 320 px width).
- [ ] When no data is available for the selected range, a helpful empty state is shown in Czech.
- [ ] All labels, legends, and callouts are in Czech.
- [ ] Correlation callouts include a disclaimer: "Toto neni lekarska diagnoza, pouze pozorovane vzory." (This is not a medical diagnosis, only observed patterns.)
- [ ] Meal log data is displayed as contextual markers on the combined view timeline (e.g., small meal icons on days with logged meals). Tapping a marker shows meal details in a tooltip.
- [ ] Meal data does NOT influence the correlation algorithm -- correlations use only manual elimination/reintroduction events from `FoodLog`.

## Implementation Details

### Files Created / Modified

| Path | Purpose |
|------|---------|
| `src/routes/(app)/trends/+page.svelte` | Dashboard page composing all chart components with date filter |
| `src/routes/(app)/trends/+page.server.ts` | Server load function aggregating severity, food, and analysis data |
| `src/lib/components/charts/SeverityChart.svelte` | Line chart for manual severity + AI scores over time |
| `src/lib/components/charts/FoodTimeline.svelte` | Horizontal bar chart for food elimination periods |
| `src/lib/components/charts/CombinedView.svelte` | Overlay composition of severity chart + food timeline on shared axis |
| `src/lib/components/charts/CorrelationCallout.svelte` | Annotation component for correlation highlights |
| `src/lib/components/charts/DateRangeFilter.svelte` | Date range picker with preset options |
| `src/lib/domain/services/correlation.ts` | Correlation detection algorithm |
| `src/lib/domain/services/trend-aggregation.ts` | Data aggregation: combines photo severity, AI scores, and food logs into chart-ready structures |
| `src/lib/stores/trends.ts` | Svelte store for dashboard filter state and computed chart data |

### Step-by-Step Instructions

1. **Define chart data types** (in `src/lib/domain/services/trend-aggregation.ts`):

   ```typescript
   export interface SeverityDataPoint {
     date: Date;
     manualSeverity: number | null;   // 1-5 from photo
     rednessScore: number | null;     // 1-10 from AI
     drynessScore: number | null;     // 1-10 from AI
     areaPercentage: number | null;   // 0-100 from AI
   }

   export interface FoodEliminationPeriod {
     food: string;
     category: string;
     color: string;
     startDate: Date;
     endDate: Date | null;  // null means ongoing
   }

   export interface Correlation {
     type: 'improvement_after_elimination' | 'worsening_after_reintroduction';
     food: string;
     triggerDate: Date;     // elimination or reintroduction date
     responseDate: Date;    // when severity changed
     daysBetween: number;
     severityBefore: number;
     severityAfter: number;
     description: string;   // Czech text
   }
   ```

2. **Implement the trend aggregation service** (`src/lib/domain/services/trend-aggregation.ts`):
   - `aggregateSeverityData(childId: string, from: Date, to: Date): Promise<SeverityDataPoint[]>`:
     1. Fetch all photos for the child in the date range with their manual severity.
     2. Fetch all analysis results for the child in the date range.
     3. Merge into a daily timeline: for days with multiple photos, average the severity. Attach AI scores from the analysis closest in date.
     4. Return sorted by date ascending.
   - `aggregateFoodTimeline(childId: string, from: Date, to: Date): Promise<FoodEliminationPeriod[]>`:
     1. Fetch all food log entries (eliminations and reintroductions) for the child.
     2. Build periods: an elimination starts a bar, a reintroduction ends it. If no reintroduction, the bar extends to `to` (ongoing).
     3. Assign consistent colors per food category from a predefined palette.
     4. Return sorted by start date.

3. **Implement the correlation detection algorithm** (`src/lib/domain/services/correlation.ts`):

   ```typescript
   export function detectCorrelations(
     severityData: SeverityDataPoint[],
     foodTimeline: FoodEliminationPeriod[],
     foodLog: FoodLogEntry[]
   ): Correlation[] {
     const correlations: Correlation[] = [];

     // Check each elimination event
     for (const entry of foodLog.filter(e => e.action === 'eliminate')) {
       const windowStart = addDays(entry.date, 5);
       const windowEnd = addDays(entry.date, 14);
       const before = averageSeverity(severityData, addDays(entry.date, -7), entry.date);
       const after = averageSeverity(severityData, windowStart, windowEnd);

       if (before !== null && after !== null && after < before * 0.7) {
         correlations.push({
           type: 'improvement_after_elimination',
           food: entry.food,
           triggerDate: entry.date,
           responseDate: windowStart,
           daysBetween: daysDiff(entry.date, windowStart),
           severityBefore: before,
           severityAfter: after,
           description: `Vylouceni ${entry.food} ${formatDateCz(entry.date)} — zlepseni do ${formatDateCz(windowEnd)}`,
         });
       }
     }

     // Check each reintroduction event
     for (const entry of foodLog.filter(e => e.action === 'reintroduce')) {
       const windowStart = addDays(entry.date, 3);
       const windowEnd = addDays(entry.date, 7);
       const before = averageSeverity(severityData, addDays(entry.date, -7), entry.date);
       const after = averageSeverity(severityData, windowStart, windowEnd);

       if (before !== null && after !== null && after > before * 1.3) {
         correlations.push({
           type: 'worsening_after_reintroduction',
           food: entry.food,
           triggerDate: entry.date,
           responseDate: windowStart,
           daysBetween: daysDiff(entry.date, windowStart),
           severityBefore: before,
           severityAfter: after,
           description: `Znovuzavedeni ${entry.food} ${formatDateCz(entry.date)} — zhorseni do ${formatDateCz(windowEnd)}`,
         });
       }
     }

     return correlations;
   }
   ```

   Key thresholds:
   - Improvement: average severity in the response window is less than 70 % of the pre-elimination average.
   - Worsening: average severity in the response window is more than 130 % of the pre-reintroduction average.
   - Elimination response window: 5-14 days after elimination.
   - Reintroduction response window: 3-7 days after reintroduction.

4. **Build the severity chart** (`src/lib/components/charts/SeverityChart.svelte`):
   - Use uPlot (~35KB canvas-based charting library, see `tech-stack.md`).
   - Line chart with date on X-axis.
   - Primary Y-axis (left): manual severity 1-5, plotted as a solid blue line with circle markers.
   - Secondary Y-axis (right): AI redness score 1-10, plotted as a dashed red line.
   - Toggle buttons to show/hide AI dryness score (dashed orange line) and area percentage (filled area, light purple).
   - Responsive: on mobile, legend collapses to an icon-only row.

5. **Build the food elimination timeline** (`src/lib/components/charts/FoodTimeline.svelte`):
   - Horizontal bar chart with time on X-axis (same scale as severity chart).
   - Each food category gets a row (Y-axis) with a colored bar spanning the elimination period.
   - Ongoing eliminations show an open-ended bar (arrow or dashed end).
   - Tooltip on tap/hover shows food name, start date, end date (or "probiha" for ongoing).

6. **Build the combined view** (`src/lib/components/charts/CombinedView.svelte`):
   - Vertically stacks `SeverityChart` on top and `FoodTimeline` on the bottom.
   - Both share the same X-axis (time) and are scroll-synced horizontally.
   - `CorrelationCallout` annotations rendered as vertical dashed lines connecting a food bar event to a severity change, with a text label.

7. **Build the date range filter** (`src/lib/components/charts/DateRangeFilter.svelte`):
   - Preset buttons: "7 dni", "30 dni", "90 dni".
   - Custom range: two date inputs (from/to).
   - Default: 30 days.
   - Dispatches a `change` event with `{ from: Date, to: Date }`.
   - Updates the `trends` store, which triggers reactivity in all chart components.

8. **Build the dashboard page** (`src/routes/(app)/trends/+page.svelte`):
   - Page title: "Trendy a korelace".
   - Child selector (if multiple children).
   - `DateRangeFilter` at the top.
   - Tab or toggle to switch between "Zavaznost" (severity only), "Strava" (food only), and "Kombinovany pohled" (combined).
   - Default view is "Kombinovany pohled".
   - Below the charts, a "Nalezene korelace" (Found correlations) section listing all `Correlation` objects as cards.
   - Disclaimer text at the bottom: "Toto neni lekarska diagnoza, pouze pozorovane vzory."
   - Empty state: if no data in the selected range, show "Zadna data pro zvolene obdobi. Pridejte fotky a zaznamy o strave." (No data for the selected period. Add photos and food records.)

9. **Server-side data loading** (`src/routes/(app)/trends/+page.server.ts`):
   - Load function fetches all required data for the default date range (30 days).
   - Query photos with severity, analysis results with scores, and food log entries.
   - Return as serialized props for SSR.
   - Client-side reactivity handles filter changes via API calls.

### Key Code Patterns

**Correlation detection with configurable windows:**

```typescript
// src/lib/domain/services/correlation.ts
const ELIMINATION_WINDOW = { minDays: 5, maxDays: 14 };
const REINTRODUCTION_WINDOW = { minDays: 3, maxDays: 7 };
const IMPROVEMENT_THRESHOLD = 0.7;  // severity must drop to 70% or less
const WORSENING_THRESHOLD = 1.3;    // severity must rise to 130% or more

function averageSeverity(
  data: SeverityDataPoint[],
  from: Date,
  to: Date
): number | null {
  const points = data.filter(
    (d) => d.date >= from && d.date <= to && d.manualSeverity !== null
  );
  if (points.length === 0) return null;
  return points.reduce((sum, p) => sum + p.manualSeverity!, 0) / points.length;
}
```

**Czech date formatting utility:**

```typescript
function formatDateCz(date: Date): string {
  return `${date.getDate()}.${date.getMonth() + 1}.`;
}
// e.g., March 5 → "5.3."
```

**Responsive chart configuration (uPlot example):**

```typescript
import uPlot from 'uplot';

const opts: uPlot.Options = {
  width: 0,   // set dynamically from container
  height: 300,
  scales: {
    x: { time: true },
    severity: { range: [1, 5] },
    ai: { range: [1, 10] },
  },
  axes: [
    { label: 'Datum', values: (u, vals) => vals.map(v => formatDateCz(new Date(v * 1000))) },
    { label: 'Zavaznost (1-5)', scale: 'severity', side: 3 },
    { label: 'AI skore (1-10)', scale: 'ai', side: 1, grid: { show: false } },
  ],
  series: [
    {},  // x-axis (timestamps)
    { label: 'Zavaznost', scale: 'severity', stroke: '#4f7cac', width: 2 },
    { label: 'Zarudnuti', scale: 'ai', stroke: '#dc3545', width: 1, dash: [5, 5] },
    { label: 'Suchost', scale: 'ai', stroke: '#ffc107', width: 1, dash: [5, 5], show: false },
  ],
};
```

**Store-driven reactivity:**

```typescript
// src/lib/stores/trends.svelte.ts (Svelte 5 runes)
let dateRange = $state<{ from: Date; to: Date }>({
  from: subDays(new Date(), 30),
  to: new Date(),
});

let selectedChildId = $state<string | null>(null);

// Reactive dashboard data — refetches when dateRange or selectedChildId changes
let dashboardData = $state<DashboardData | null>(null);

$effect(() => {
  if (!selectedChildId) return;
  fetchDashboardData(selectedChildId, dateRange.from, dateRange.to)
    .then(data => { dashboardData = data; });
});

export function getDateRange() { return dateRange; }
export function setDateRange(range: { from: Date; to: Date }) { dateRange = range; }
export function getSelectedChildId() { return selectedChildId; }
export function setSelectedChildId(id: string | null) { selectedChildId = id; }
export function getDashboardData() { return dashboardData; }
```

## Post-Implementation State

After completing Phase 5 the application provides a comprehensive trends and correlation dashboard:

- The trends tab ("Trendy a korelace") shows a combined view with a severity timeline chart on top and food elimination bars underneath, aligned on the same time axis.
- The severity chart plots manual ratings (1-5) as a solid line and AI redness/dryness scores (1-10) as dashed lines, with toggleable series.
- Food elimination periods are rendered as colored horizontal bars, one row per food category, with consistent colors.
- The correlation detection algorithm scans for severity improvements within 5-14 days of food eliminations and worsening within 3-7 days of reintroductions. Detected patterns are shown as annotated callouts on the combined chart and listed as cards below.
- Callout messages are in Czech, for example: "Vylouceni mlecnych vyrobku 5.3. -- zlepseni do 12.3."
- A date range filter (7/30/90 days or custom) lets users narrow the view. Default is 30 days.
- A disclaimer reminds users this is not a medical diagnosis.
- The dashboard is responsive and usable on mobile (320 px minimum width).
- Empty states are handled with helpful Czech text prompting the user to add data.

## Test Suite

### Unit Tests

**Correlation detection (`src/lib/domain/services/correlation.test.ts`):**

| # | Test case | Expected result |
|---|-----------|-----------------|
| 1 | Clear improvement after elimination: severity drops from 4.0 to 2.0 within 5-14 days of eliminating dairy | One `improvement_after_elimination` correlation detected for dairy |
| 2 | No improvement after elimination: severity stays at 4.0 after eliminating eggs | No correlation detected |
| 3 | Marginal improvement (severity drops from 4.0 to 3.5, which is 87.5 % -- above 70 % threshold) | No correlation detected (threshold not met) |
| 4 | Worsening after reintroduction: severity rises from 2.0 to 3.5 within 3-7 days of reintroducing dairy | One `worsening_after_reintroduction` correlation detected |
| 5 | No worsening after reintroduction: severity stays at 2.0 after reintroducing soy | No correlation detected |
| 6 | Multiple foods eliminated simultaneously: dairy and wheat eliminated on the same day, severity improves | Two correlations detected (one per food), each with correct food name |
| 7 | Overlapping elimination periods: dairy eliminated on day 1, wheat eliminated on day 5, severity improves on day 10 | Both detected; algorithm does not attempt to distinguish which food caused improvement |
| 8 | No severity data in the response window (no photos taken during 5-14 day window) | No correlation detected (insufficient data) |
| 9 | Elimination with only one severity data point before and one after | Correlation detected if the single points meet the threshold |
| 10 | Food eliminated and reintroduced quickly (reintroduced on day 3, within the elimination response window) | Elimination correlation not detected (window overlaps with reintroduction) |
| 11 | Empty severity data array | Returns empty correlations array |
| 12 | Empty food log | Returns empty correlations array |
| 13 | Severity data only has AI scores, no manual severity | No correlation detected (algorithm uses `manualSeverity` which is null) |

**Trend aggregation (`src/lib/domain/services/trend-aggregation.test.ts`):**

| # | Test case | Expected result |
|---|-----------|-----------------|
| 1 | Single photo on a given date produces one `SeverityDataPoint` with manual severity | `manualSeverity` matches the photo's severity; AI fields are null if no analysis exists |
| 2 | Two photos on the same date: severities 2 and 4 | Averaged to `manualSeverity: 3` for that date |
| 3 | Photo with a corresponding AI analysis result | `rednessScore`, `drynessScore`, `areaPercentage` populated from the analysis |
| 4 | Photo with no corresponding analysis | AI fields are null |
| 5 | Food elimination started before the date range, still active | `FoodEliminationPeriod` starts at the range's `from` date (clamped) |
| 6 | Food elimination started and ended within the range | Period start and end match the log entries |
| 7 | Ongoing elimination (no reintroduction) | `endDate` is null |
| 8 | Date range with no data | Returns empty arrays |
| 9 | Multiple children: data for child A does not appear in child B's aggregation | Correct child filtering |

**`averageSeverity` helper (`correlation.test.ts`):**

| # | Test case | Expected result |
|---|-----------|-----------------|
| 1 | Three data points in range with severities 2, 3, 4 | Returns 3.0 |
| 2 | No data points in range | Returns null |
| 3 | One data point with null `manualSeverity` | Returns null (filtered out, no valid points) |
| 4 | Mix of null and non-null severities | Averages only the non-null values |

**Date range filter (`DateRangeFilter.test.ts`):**

| # | Test case | Expected result |
|---|-----------|-----------------|
| 1 | Clicking "7 dni" sets range to last 7 days | `from` is 7 days before today; `to` is today |
| 2 | Clicking "30 dni" sets range to last 30 days | Correct date range |
| 3 | Clicking "90 dni" sets range to last 90 days | Correct date range |
| 4 | Setting custom from/to dates dispatches correct range | Event payload matches input dates |
| 5 | Setting `from` after `to` shows validation error | Error message: "Datum 'od' musi byt pred datem 'do'" |

**Czech date formatting (`formatDateCz`):**

| # | Test case | Expected result |
|---|-----------|-----------------|
| 1 | January 1 | "1.1." |
| 2 | March 5 | "5.3." |
| 3 | December 31 | "31.12." |

### Integration Tests

**Data aggregation queries (`trend-aggregation.integration.test.ts`):**

| # | Test case | Expected result |
|---|-----------|-----------------|
| 1 | `aggregateSeverityData` with photos and analysis results in DB returns merged data | `SeverityDataPoint` array with both manual and AI fields |
| 2 | `aggregateSeverityData` respects date range: photos outside range excluded | Only in-range data returned |
| 3 | `aggregateFoodTimeline` with elimination and reintroduction logs returns correct periods | Start/end dates match log entries |
| 4 | `aggregateFoodTimeline` assigns consistent colors per food category across multiple calls | Same food always gets same color |
| 5 | Dashboard server load function returns all three data sets | Response contains `severityData`, `foodTimeline`, and `correlations` |

**Dashboard page server load (`trends.page.server.integration.test.ts`):**

| # | Test case | Expected result |
|---|-----------|-----------------|
| 1 | Authenticated user with data receives populated dashboard props | All data arrays non-empty |
| 2 | Authenticated user with no data receives empty arrays and no errors | Empty arrays; no 500 |
| 3 | Unauthenticated request redirects to login | 302 redirect |

### E2E / Manual Tests

| # | Scenario | Steps | Expected result |
|---|----------|-------|-----------------|
| 1 | Dashboard loads with data | Navigate to `/trends`. Ensure there are photos and food logs from previous phases. | Charts render within 3 seconds. Severity line visible. Food bars visible. |
| 2 | Date range filter (preset) | Click "7 dni" button. | Charts update to show only last 7 days of data. |
| 3 | Date range filter (custom) | Enter custom from/to dates spanning 2 weeks. | Charts update to show only that 2-week period. |
| 4 | Severity chart toggle | Toggle AI dryness score on/off. | Dryness line appears/disappears. Other lines unaffected. |
| 5 | Food timeline hover | Hover/tap on a food elimination bar. | Tooltip shows food name, start date, end date (or "probiha"). |
| 6 | Correlation callout display | Ensure data includes an elimination with subsequent improvement. Open combined view. | Callout annotation visible on the chart with Czech text. |
| 7 | Correlation list | Scroll below charts to "Nalezene korelace" section. | Correlation cards listed with food name, dates, and severity change. |
| 8 | Disclaimer visible | Scroll to bottom of dashboard. | Disclaimer text visible: "Toto neni lekarska diagnoza, pouze pozorovane vzory." |
| 9 | Empty state | Set date range to a period with no data. | Empty state message: "Zadna data pro zvolene obdobi." with guidance to add data. |
| 10 | Mobile responsiveness | Open dashboard on a 320 px wide viewport. | Charts readable. Legend does not overflow. Scroll works. |
| 11 | Multiple children | Switch between two children using the child selector. | Dashboard data updates to reflect the selected child's data. |
| 12 | Combined view alignment | Open combined view. Scroll horizontally. | Severity chart and food timeline scroll together; time axes stay aligned. |

### Regression Checks

- [ ] Phase 4 AI analysis still works: comparison view, analysis button, result storage.
- [ ] Phase 3 photo diary still works: capture, gallery, detail, comparison, encryption.
- [ ] Phase 2 food tracking still works: food log entries, elimination/reintroduction logging.
- [ ] Phase 1 authentication still works: login, logout, session persistence.
- [ ] Adding a new photo or food log entry after this phase is implemented appears in the dashboard on next load.
- [ ] The trends page does not degrade performance of other pages (no heavy JS bundles loaded globally).
- [ ] Chart library CSS does not conflict with Tailwind CSS 4 utilities on existing pages.
- [ ] Navigation between the trends tab and other app sections works without layout shifts or route errors.
