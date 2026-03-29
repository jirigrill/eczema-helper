# Phase 4: AI-Powered Eczema Analysis

## Summary

This phase adds AI-driven comparison analysis to the photo diary. Users select two photos from the comparison view, both are decrypted locally in the browser, and then sent to a server-side proxy (`POST /api/analyze`) which forwards them to the Claude Vision API. The API key stays server-side and the server holds decrypted photos only in memory for the duration of the request. Claude returns a structured assessment in Czech -- trend direction, redness score, affected area percentage, dryness score, and a natural-language explanation. The text-only result is stored on the server in an `analysis_results` table. An analysis history view lets users review past assessments per child. The architecture follows Ports and Adapters: an `EczemaAnalyzer` port defines the contract, and a `ClaudeVisionAnalyzer` adapter implements it.

## Prerequisites

- **Phase 1** -- authentication (session cookies) for securing the analysis results API.
- **Phase 2** -- food tracking, so that `FoodLog` entries between the two photo dates can be included as analysis context.
- **Phase 3** -- photo diary with E2E encryption, enabling photo selection, client-side decryption, and the comparison view infrastructure.
- Claude API key available server-side in `.env` (used by the server proxy, never exposed to client).

## Features

1. **EczemaAnalyzer port interface** -- domain port defining the analysis contract independent of any specific AI provider, supporting both skin and stool photo types.
2. **ClaudeVisionAnalyzer adapter** -- implements the port by sending decrypted photos to the server proxy (`POST /api/analyze`), which forwards them to the Claude Vision API with type-specific Czech-language prompts (skin analysis or stool analysis). API key stays server-side.
3. **Comparison analysis flow** -- from the existing comparison view (Phase 3), user taps an "Analyzovat" button; both photos (same type) are decrypted locally and sent to Claude.
4. **Structured analysis result (skin)** -- trend (improving / worsening / stable), redness score (1-10), affected area percentage (0-100), dryness score (1-10), Czech explanation text.
5. **Structured analysis result (stool)** -- trend (improving / worsening / stable), color assessment, consistency assessment, presence of abnormalities (mucus/blood), Czech explanation text.
6. **Server-side result storage** -- text-only results stored in PostgreSQL `analysis_results` table (no images stored server-side).
7. **Analysis history view** -- per-child list of past analyses with date, photo type badge, trend badge, and expandable detail.
8. **Error handling** -- network failures, rate limits (429), invalid responses, and API key issues surfaced as user-friendly Czech messages.
9. **Food context enrichment** -- food log changes and meal data between the two photo dates are included in the prompt so Claude can reference dietary changes.

## Acceptance Criteria

- [ ] "Analyzovat" button appears on the comparison view when exactly two photos are selected.
- [ ] Tapping the button decrypts both photos client-side and sends them to the server proxy (`POST /api/analyze`), which forwards to Claude. Photos exist in server memory only during the request.
- [ ] The Claude Vision API receives both images and a context object containing child age, body area, days between photos, and food changes.
- [ ] The response is parsed into the structured `AnalysisResult` type (trend, redness, area percentage, dryness, explanation).
- [ ] The explanation text is in Czech.
- [ ] The structured result is saved to the server via `POST /api/analysis`.
- [ ] The analysis history page lists all past analyses for the selected child, sorted newest first.
- [ ] Each history entry shows date, trend badge (color-coded: green for improving, red for worsening, grey for stable), and an expandable detail section.
- [ ] Network errors display "Nelze se pripojit k AI sluzbe. Zkuste to prosim pozdeji." (Cannot connect to AI service. Please try again later.)
- [ ] Rate limit errors (429) display "Prilis mnoho pozadavku. Pockejte chvili a zkuste znovu." (Too many requests. Wait a moment and try again.)
- [ ] Invalid or unparseable API responses display a generic error and log the raw response for debugging.
- [ ] The API key is configured server-side in `.env` (never exposed to the client browser).
- [ ] All UI text is in Czech.
- [ ] **Stool analysis acceptance criteria:**
  - Stool photos return `StoolAnalysisResult` with `colorAssessment`, `consistencyAssessment`, `hasAbnormalities`, and Czech `explanation`.
  - Trend badge displays correctly for stool analyses (improving/worsening/stable).
  - Analysis history distinguishes skin vs stool with a photo type badge.
  - Stool analysis prompt references mother's dietary changes and their potential impact on infant stool.
- [ ] **Analysis results stored as text only:** Photos are decrypted client-side, sent to the server proxy in memory only, forwarded to Claude, and immediately discarded after the response. No decrypted photos are written to disk or stored in the database. Only the text-based `AnalysisResult` is persisted.

## Implementation Details

### Files Created / Modified

| Path | Purpose |
|------|---------|
| `src/lib/domain/ports/analyzer.ts` | `EczemaAnalyzer` interface, `AnalysisContext`, `AnalysisResult` types |
| `src/lib/adapters/claude-vision.ts` | `ClaudeVisionAnalyzer` class implementing the `EczemaAnalyzer` port |
| `src/lib/domain/services/analysis.ts` | Orchestration service: decrypt photos, gather context, call analyzer, persist result |
| `src/routes/(app)/photos/compare/+page.svelte` | **Modified**: add "Analyzovat" button, loading state, result display |
| `src/routes/(app)/analysis/+page.svelte` | Analysis history page per child |
| `src/lib/components/analysis/AnalysisResultCard.svelte` | Card displaying a single analysis result with trend badge and scores |
| `src/lib/components/analysis/AnalysisHistory.svelte` | Scrollable list of `AnalysisResultCard` components |
| `src/routes/api/analysis/+server.ts` | `POST` (store result), `GET` (list results by child) |
| `src/lib/stores/analysis.ts` | Svelte store for analysis results state |
| Database migration | `analysis_results` table: `id`, `user_id`, `child_id`, `photo1_id`, `photo2_id`, `trend`, `redness_score`, `area_percentage`, `dryness_score`, `explanation`, `food_context`, `created_at` |

### Step-by-Step Instructions

1. **Define the port** (`src/lib/domain/ports/analyzer.ts`):

   ```typescript
   export type Trend = 'improving' | 'worsening' | 'stable';
   export type PhotoType = 'skin' | 'stool';

   export interface AnalysisContext {
     photoType: PhotoType;
     childAge: string;          // e.g. "6 tydnu" (6 weeks)
     bodyArea?: string;         // e.g. "face" (skin only)
     daysBetween: number;       // days between the two photos
     foodChanges: FoodLog[];    // food log entries between the two dates
     meals?: Meal[];            // meals logged between the two dates
   }

   // Skin analysis result
   export interface SkinAnalysisResult {
     photoType: 'skin';
     trend: Trend;
     rednessScore: number;      // 1-10
     areaPercentage: number;    // 0-100
     drynessScore: number;      // 1-10
     explanation: string;       // Czech-language text
   }

   // Stool analysis result
   export interface StoolAnalysisResult {
     photoType: 'stool';
     trend: Trend;
     colorAssessment: string;   // Czech description of color change
     consistencyAssessment: string; // Czech description of consistency change
     hasAbnormalities: boolean; // mucus or blood detected
     explanation: string;       // Czech-language text
   }

   export type AnalysisResult = SkinAnalysisResult | StoolAnalysisResult;

   export interface EczemaAnalyzer {
     analyze(
       photo1: Blob,
       photo2: Blob,
       context: AnalysisContext
     ): Promise<AnalysisResult>;
   }
   ```

2. **Implement the Claude Vision adapter** (`src/lib/adapters/claude-vision.ts`):
   - Client-side adapter: sends decrypted photos to the server proxy at `POST /api/analyze`.
   - The server-side proxy handler (`src/routes/api/analyze/+server.ts`):
     1. Validates the session (auth required).
     2. Reads the API key from `CLAUDE_API_KEY` env var.
     3. Builds a multimodal message with both images as base64-encoded `image/jpeg` content blocks.
     4. Selects the system prompt based on `context.photoType`:
        - Skin: instruct Claude to assess eczema changes and return `SkinAnalysisResult` JSON schema.
        - Stool: instruct Claude to assess stool changes (color, consistency, abnormalities) and return `StoolAnalysisResult` JSON schema.
     5. The user message includes the `AnalysisContext` fields formatted as Czech text, plus meal data when available.
     6. Forwards to Claude Vision API and streams response back to client.
     7. Discards image data from memory after response completes.
   - Client parses the JSON response; validates all fields per the photo type (trend is one of the three enum values, scores within range for skin, string assessments for stool).
   - On parse failure, throw `AnalysisParseError` with the raw response attached.
   - On HTTP 429, throw `RateLimitError`.
   - On network failure, throw `NetworkError`.

3. **Build the analysis orchestration service** (`src/lib/domain/services/analysis.ts`):
   - `runAnalysis(photo1Id: string, photo2Id: string, childId: string)`:
     1. Load encrypted blobs for both photos from storage.
     2. Decrypt both using the session encryption key.
     3. Fetch `FoodLog` entries between the two photo dates from the food tracking store.
     4. Compute `daysBetween` from the photo timestamps.
     5. Build `AnalysisContext` (child age calculated from child's birth date and the later photo date).
     6. Call `analyzer.analyze(photo1Blob, photo2Blob, context)`.
     7. Persist the `AnalysisResult` plus metadata via `POST /api/analysis`.
     8. Return the result to the UI.

4. **Update the comparison page** (`src/routes/(app)/photos/compare/+page.svelte`):
   - Add an "Analyzovat" button below the two photos.
   - On click, show a loading spinner with "Analyzuji..." text.
   - On success, display the `AnalysisResultCard` inline below the button.
   - On error, display the appropriate Czech error message.

5. **Build the analysis history page** (`src/routes/(app)/analysis/+page.svelte`):
   - Fetch results from `GET /api/analysis?childId=...`.
   - Render `AnalysisHistory` -- a list of `AnalysisResultCard` components.
   - Each card shows: date, trend badge (colored chip), redness/dryness/area scores, and an expandable explanation section.

6. **Server API** (`src/routes/api/analysis/+server.ts`):
   - `POST /api/analysis` -- accepts JSON body with all `AnalysisResult` fields plus `photo1_id`, `photo2_id`, `child_id`, `food_context`. Validates auth, inserts into `analysis_results`. Returns 201.
   - `GET /api/analysis?childId=...` -- returns all analysis results for the given child belonging to the authenticated user, sorted newest first. Returns 200 with JSON array.
   - `GET /api/analysis/:id` -- returns a single analysis result. Returns 200 or 404.
   - Auth check on all endpoints; 401 if unauthenticated, 403 if accessing another user's data.

7. **Database migration**:
   - Create `analysis_results` table with columns as listed above.
   - Index on `(user_id, child_id, created_at)` for efficient listing queries.
   - Foreign keys to `users`, `children`, and `photos` tables.

### Key Code Patterns

**Client-side adapter (calls server proxy):**

```typescript
// src/lib/adapters/claude-vision.ts (client-side)
export class ClaudeVisionAnalyzer implements EczemaAnalyzer {
  async analyze(photo1: Blob, photo2: Blob, context: AnalysisContext): Promise<AnalysisResult> {
    const formData = new FormData();
    formData.append('photo1', photo1, 'photo1.jpg');
    formData.append('photo2', photo2, 'photo2.jpg');
    formData.append('context', JSON.stringify(context));

    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData,
    });

    if (response.status === 429) throw new RateLimitError();
    if (!response.ok) throw new NetworkError(response.statusText);

    const data = await response.json();
    return this.parseResult(data);
  }
}
```

**Server-side proxy (forwards to Claude API):**

```typescript
// src/routes/api/analyze/+server.ts
import { CLAUDE_API_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) throw error(401);

  const formData = await request.formData();
  const photo1 = formData.get('photo1') as File;
  const photo2 = formData.get('photo2') as File;
  const context = JSON.parse(formData.get('context') as string);

  const [img1, img2] = await Promise.all([
    fileToBase64(photo1),
    fileToBase64(photo2),
  ]);

  const systemPrompt = context.photoType === 'skin'
    ? SKIN_ANALYSIS_PROMPT
    : STOOL_ANALYSIS_PROMPT;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6-20250627',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img1 } },
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img2 } },
          { type: 'text', text: formatContextCzech(context) },
        ],
      }],
    }),
  });

  // Photos are now out of scope — GC will reclaim the memory
  if (!response.ok) return new Response(response.statusText, { status: response.status });
  return new Response(response.body, { headers: { 'Content-Type': 'application/json' } });
};
```

### Claude API Resilience

**Request timeout:** Set a 60-second timeout on the Claude API call. If exceeded, return a timeout error to the client:

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 60_000);

try {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    signal: controller.signal,
    // ... headers, body
  });
} finally {
  clearTimeout(timeout);
}
```

**Concurrency limit:** Allow maximum 2 simultaneous Claude API calls. Queue additional requests or return a "busy" status:

```typescript
let activeAnalyses = 0;
const MAX_CONCURRENT = 2;

if (activeAnalyses >= MAX_CONCURRENT) {
  return json({ error: 'Analýza je momentálně zaneprázdněna. Zkuste to za chvíli.', code: 'ANALYSIS_BUSY' }, { status: 503 });
}
```

**Circuit breaker:** After 3 consecutive Claude API failures, stop sending requests for 5 minutes and return an error immediately. Reset on the first success.

**Memory management:** After forwarding photos to Claude and receiving the response, explicitly dereference the photo buffers:

```typescript
// After sending to Claude
photo1Buffer = null;
photo2Buffer = null;
// Response streaming preferred over full buffering
```

**System prompts for structured output (type-specific):**

```typescript
const SKIN_ANALYSIS_PROMPT = `Jsi dermatologicky AI asistent specializovany na atopicky ekzem u kojencu.
Porovnej dve fotky ekzemu a vrat POUZE validni JSON objekt v tomto formatu:
{
  "photoType": "skin",
  "trend": "improving" | "worsening" | "stable",
  "rednessScore": <1-10>,
  "areaPercentage": <0-100>,
  "drynessScore": <1-10>,
  "explanation": "<cesky text vysvetlujici zmeny, max 300 slov>"
}
Beri v uvahu vek ditete, oblast tela a zmeny ve strave.
Neposkytuji lekarskou diagnozu, pouze pozorovani zmen.`;

const STOOL_ANALYSIS_PROMPT = `Jsi pediatricky AI asistent specializovany na hodnoceni stolice kojencu v kontextu eliminacni diety.
Porovnej dve fotky stolice a vrat POUZE validni JSON objekt v tomto formatu:
{
  "photoType": "stool",
  "trend": "improving" | "worsening" | "stable",
  "colorAssessment": "<cesky popis zmeny barvy>",
  "consistencyAssessment": "<cesky popis zmeny konzistence>",
  "hasAbnormalities": true | false,
  "explanation": "<cesky text vysvetlujici zmeny a co mohou naznacovat, max 300 slov>"
}
Beri v uvahu vek ditete a zmeny ve strave matky.
Zamer se na: barvu (zelena muze znacit intoleranci), pritomnost hlenu, krve.
Neposkytuji lekarskou diagnozu, pouze pozorovani zmen.`;
```

**Ports and Adapters -- dependency injection:**

```typescript
// src/lib/domain/services/analysis.ts
export class AnalysisService {
  constructor(
    private analyzer: EczemaAnalyzer,
    private photoStorage: PhotoStorage,
    private cryptoService: CryptoService,
    private foodStore: FoodStorePort,
  ) {}

  async runAnalysis(photo1Id: string, photo2Id: string, childId: string): Promise<AnalysisResult> {
    const [blob1, blob2] = await Promise.all([
      this.photoStorage.getBlob(photo1Id),
      this.photoStorage.getBlob(photo2Id),
    ]);

    const [decrypted1, decrypted2] = await Promise.all([
      this.cryptoService.decryptBlob(blob1, photo1Id),
      this.cryptoService.decryptBlob(blob2, photo2Id),
    ]);

    const [meta1, meta2] = await Promise.all([
      this.photoStorage.getMetadata(photo1Id),
      this.photoStorage.getMetadata(photo2Id),
    ]);

    const foodChanges = await this.foodStore.getLogsBetween(meta1.createdAt, meta2.createdAt);
    const daysBetween = Math.round(
      (meta2.createdAt.getTime() - meta1.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const context: AnalysisContext = {
      childAge: this.computeAge(childId, meta2.createdAt),
      bodyArea: meta1.bodyArea,
      daysBetween,
      foodChanges,
    };

    return this.analyzer.analyze(
      new Blob([decrypted1]),
      new Blob([decrypted2]),
      context,
    );
  }
}
```

## Post-Implementation State

After completing Phase 4 the application supports AI-powered eczema comparison analysis:

- From the comparison view (Phase 3), users tap the "Analyzovat" button after selecting two photos.
- Both photos are decrypted locally in the browser. The decrypted images and contextual metadata (child age, body area, days between photos, food log changes from Phase 2) are sent to the Claude Vision API directly from the client.
- Claude returns a structured JSON response: trend direction (improving / worsening / stable), redness score (1-10), affected area percentage (0-100), dryness score (1-10), and a Czech-language explanation.
- The text-only result (no images) is persisted server-side in the `analysis_results` table via the API.
- An analysis history page shows all past analyses for a given child, with color-coded trend badges and expandable detail cards.
- Errors from the Claude API (network failures, rate limits, parse failures) are caught and displayed as user-friendly Czech messages.
- The `EczemaAnalyzer` port interface makes it straightforward to swap in a different AI provider in the future without changing domain logic.

## Test Suite

### Unit Tests

**Analysis service (`src/lib/domain/services/analysis.test.ts`):**

| # | Test case | Expected result |
|---|-----------|-----------------|
| 1 | `runAnalysis` with a mock analyzer that returns a valid result completes successfully | Returns the `AnalysisResult` from the mock |
| 2 | `runAnalysis` correctly computes `daysBetween` from two photo timestamps 10 days apart | `context.daysBetween === 10` |
| 3 | `runAnalysis` fetches food logs only for the date range between the two photos | Mock food store's `getLogsBetween` called with correct dates |
| 4 | `runAnalysis` passes the correct body area from photo metadata to the context | `context.bodyArea` matches `meta1.bodyArea` |
| 5 | `runAnalysis` computes child age correctly (e.g., child born 6 weeks before the later photo date) | `context.childAge === '6 tydnu'` |
| 6 | `runAnalysis` when the analyzer throws `NetworkError` propagates the error | `NetworkError` thrown |
| 7 | `runAnalysis` when decryption fails propagates `DecryptionError` | `DecryptionError` thrown |

**Claude Vision adapter (`src/lib/adapters/claude-vision.test.ts`):**

| # | Test case | Expected result |
|---|-----------|-----------------|
| 1 | Valid API response with correct JSON is parsed into `AnalysisResult` | All fields match the API response values |
| 2 | API response with `trend: "improving"` maps correctly | `result.trend === 'improving'` |
| 3 | API response with `rednessScore: 0` (out of range) throws `AnalysisParseError` | Parse error thrown; raw response attached |
| 4 | API response with `rednessScore: 11` (out of range) throws `AnalysisParseError` | Parse error thrown |
| 5 | API response with `trend: "unknown"` (invalid enum) throws `AnalysisParseError` | Parse error thrown |
| 6 | API response with non-JSON body throws `AnalysisParseError` | Parse error thrown |
| 7 | HTTP 429 response throws `RateLimitError` | `RateLimitError` thrown |
| 8 | HTTP 500 response throws `NetworkError` | `NetworkError` thrown |
| 9 | Network timeout throws `NetworkError` | `NetworkError` thrown |
| 10 | Request body contains both images as base64 and the context in Czech | Verify fetch was called with correct body structure |
| 11 | `areaPercentage` of 0 is accepted as valid | Parsed successfully |
| 12 | `areaPercentage` of 100 is accepted as valid | Parsed successfully |

**Result parsing edge cases (`claude-vision.parse.test.ts`):**

| # | Test case | Expected result |
|---|-----------|-----------------|
| 1 | JSON wrapped in markdown code fences is still parsed | Result extracted correctly |
| 2 | Extra fields in JSON are ignored | Only known fields mapped |
| 3 | Missing `explanation` field throws `AnalysisParseError` | Error thrown |
| 4 | `drynessScore` as string "5" is coerced to number | `result.drynessScore === 5` |

### Integration Tests

**Analysis results API (`src/routes/api/analysis/server.integration.test.ts`):**

| # | Test case | Expected result |
|---|-----------|-----------------|
| 1 | `POST /api/analysis` with valid body returns 201 and persists the result | Database contains the new row |
| 2 | `POST /api/analysis` without authentication returns 401 | Response status 401 |
| 3 | `POST /api/analysis` with missing required fields returns 400 | Response status 400; error specifies missing field |
| 4 | `POST /api/analysis` with `rednessScore: 15` (out of range) returns 400 | Validation error |
| 5 | `GET /api/analysis?childId=X` returns only results for child X belonging to the authenticated user | Correct filtering |
| 6 | `GET /api/analysis?childId=X` for another user's child returns empty array (or 403) | No data leakage |
| 7 | `GET /api/analysis/:id` returns the full result | All fields present |
| 8 | `GET /api/analysis/:id` for a nonexistent ID returns 404 | Response status 404 |
| 9 | Results are returned sorted by `created_at` descending | First result is the most recent |

### E2E / Manual Tests

| # | Scenario | Steps | Expected result |
|---|----------|-------|-----------------|
| 1 | Full analysis flow | Navigate to comparison view. Select two photos from different dates. Tap "Analyzovat". Wait for result. | Loading spinner shows "Analyzuji...". Result card appears with trend badge, scores, and Czech explanation. |
| 2 | Analysis with food context | Ensure food log has entries between the two photo dates (e.g., dairy eliminated). Run analysis. | Claude's explanation references dietary changes. |
| 3 | Analysis history | Run two analyses for the same child. Navigate to analysis history page. | Both results listed, newest first. Trend badges color-coded correctly. |
| 4 | Expand analysis detail | On history page, tap an analysis card. | Explanation text expands. Scores visible. |
| 5 | Network error during analysis | Disable network. Tap "Analyzovat". | Error message: "Nelze se pripojit k AI sluzbe. Zkuste to prosim pozdeji." |
| 6 | Rate limit error | Trigger rate limiting (or mock 429). Tap "Analyzovat". | Error message: "Prilis mnoho pozadavku. Pockejte chvili a zkuste znovu." |
| 7 | Invalid API key | Set an invalid API key. Tap "Analyzovat". | Error message indicating authentication failure. |
| 8 | Analysis with same photo twice | Select the same photo for both slots. Tap "Analyzovat". | Either prevented by UI (button disabled) or Claude returns "stable" with explanation. |

### Regression Checks

- [ ] Phase 3 photo diary still works: capture, gallery, detail, comparison views unaffected.
- [ ] Phase 2 food tracking pages load correctly and food log data is accessible.
- [ ] Phase 1 authentication and session management are unaffected.
- [ ] Encryption/decryption from Phase 3 still works after adding the analysis flow.
- [ ] Offline photo capture and sync from Phase 3 still function.
- [ ] The comparison page layout accommodates the new "Analyzovat" button and result card without breaking existing styling.
- [ ] Navigation to the new analysis history page does not break existing route guards or layouts.

### Test Fixtures

Create `tests/fixtures/claude-responses/` with sample JSON response files:
- `valid-skin-analysis.json` — Standard successful skin comparison
- `valid-stool-analysis.json` — Standard successful stool comparison
- `malformed-response.json` — Missing required fields
- `markdown-wrapped.json` — Response wrapped in markdown code blocks (Claude sometimes does this)
- `rate-limited.json` — 429 response body

Use these fixtures in unit tests for `ClaudeVisionAnalyzer` response parsing. This makes regression detection trivial when Claude's response format changes.

### Navigation

Access analysis history via the Photos tab: add a sub-navigation within the photos page: **Galerie** | **Srovnání** | **Historie analýz** (Gallery | Compare | Analysis History). The analysis history shows a chronological list of past AI comparisons with trend badges.
