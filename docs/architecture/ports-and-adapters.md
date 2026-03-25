# Ports & Adapters Architecture

This document describes the architectural pattern used in the Eczema Tracker PWA, the responsibilities of each layer, all port interfaces, all adapter implementations, and how to swap adapters.

---

## Why Ports & Adapters (Hexagonal Architecture)

The Ports & Adapters pattern separates business logic from infrastructure concerns. The core domain (food tracking logic, photo management, analysis orchestration) knows nothing about databases, APIs, or file systems. Instead, it depends on abstract interfaces (ports), which are implemented by concrete adapters.

This matters for the Eczema Tracker because:

1. **AI provider flexibility** -- The Claude Vision API could be replaced with a local model, GPT-4 Vision, or a specialized eczema analysis model without changing any business logic.
2. **Storage flexibility** -- PostgreSQL could be swapped for SQLite (for a simpler deployment) or the photo storage could move from filesystem to S3 without touching the domain layer.
3. **Testability** -- Domain services can be tested with in-memory mock adapters, no database or API calls needed.
4. **Incremental development** -- Start with simple adapters (local storage, mock AI) and upgrade to production adapters later.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                       SvelteKit App                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  UI Layer (Svelte Components)                          │  │
│  │  routes/ + lib/components/                             │  │
│  │                                                        │  │
│  │  - Renders pages and handles user interaction          │  │
│  │  - Reads from Svelte stores                            │  │
│  │  - Calls domain services in response to user actions   │  │
│  └───────────────────────┬────────────────────────────────┘  │
│                          │ calls                             │
│  ┌───────────────────────┴────────────────────────────────┐  │
│  │  Domain Layer (Business Logic)                         │  │
│  │  lib/domain/services/                                  │  │
│  │                                                        │  │
│  │  - FoodTrackingService                                 │  │
│  │  - PhotoDiaryService                                   │  │
│  │  - AnalysisService                                     │  │
│  │  - ExportService                                       │  │
│  └───────────────────────┬────────────────────────────────┘  │
│                          │ uses ports                        │
│  ┌───────────────────────┴────────────────────────────────┐  │
│  │  Ports (Interfaces)             lib/domain/ports/      │  │
│  │                                                        │  │
│  │  - EczemaAnalyzer                                      │  │
│  │  - PhotoStorage                                        │  │
│  │  - DataRepository                                      │  │
│  │  - NotificationService                                 │  │
│  └───────────────────────┬────────────────────────────────┘  │
│                          │ implemented by                    │
│  ┌───────────────────────┴────────────────────────────────┐  │
│  │  Adapters (Implementations)     lib/adapters/          │  │
│  │                                                        │  │
│  │  - ClaudeVisionAnalyzer   (future: EczemaNet, GPT-4V) │  │
│  │  - EncryptedFSStorage     (future: S3, R2)            │  │
│  │  - PostgresRepository     (future: SQLite)            │  │
│  │  - WebPushNotifications   (future: email, SMS)        │  │
│  │  - DexieLocalDB           (offline cache)             │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Layer Responsibilities

### UI Layer

**Location:** `src/routes/` and `src/lib/components/`

**Does:**
- Render Svelte components (pages, layouts, UI elements).
- Handle user interactions (button clicks, form submissions, camera capture).
- Read reactive state from Svelte stores (`$state`, `$derived`).
- Call domain service methods in response to user actions.
- Display loading states, errors, and success feedback.
- Manage client-side routing and navigation.

**Does NOT:**
- Contain business logic (e.g., deciding if a food can be reintroduced, calculating severity trends).
- Directly call APIs, databases, or external services.
- Know about specific adapter implementations.

### Domain Layer

**Location:** `src/lib/domain/services/`

**Does:**
- Implement all business rules and application logic.
- Orchestrate multi-step operations (e.g., encrypt photo, upload, save metadata).
- Validate data before passing it to ports.
- Transform data between formats as needed.
- Define the canonical data models (`src/lib/domain/models.ts`).

**Does NOT:**
- Know about Svelte, SvelteKit, or any UI framework.
- Import any adapter directly (only port interfaces).
- Make HTTP requests, database queries, or filesystem calls.
- Know about encryption algorithms or API protocols (those are adapter concerns).

### Ports (Interfaces)

**Location:** `src/lib/domain/ports/`

**Does:**
- Define TypeScript interfaces that describe what operations the domain needs.
- Specify method signatures, parameter types, and return types.
- Act as a contract between the domain layer and the adapter layer.

**Does NOT:**
- Contain any implementation code.
- Reference specific technologies (no "PostgreSQL," "Claude," or "AES" in port definitions).

### Adapters (Implementations)

**Location:** `src/lib/adapters/`

**Does:**
- Implement port interfaces with concrete technology.
- Handle all technology-specific details (SQL queries, API calls, encryption, push payloads).
- Manage connections, retries, error mapping, and resource cleanup.
- Can be swapped without changing any other layer.

**Does NOT:**
- Contain business logic.
- Be imported directly by the UI layer or domain services (only injected via dependency injection or a factory).

---

## Port Interfaces

### EczemaAnalyzer

**File:** `src/lib/domain/ports/analyzer.ts`

Responsible for analyzing tracking photos (skin eczema and stool) and comparing them over time.

```typescript
interface AnalysisContext {
  photoType: 'skin' | 'stool';
  childAge: string;              // e.g., "6 tydnu" (6 weeks)
  bodyArea?: string;             // e.g., "face" (skin only)
  daysBetween: number;
  recentFoodChanges: FoodLog[];
  meals?: Meal[];                // meals between the two photo dates
}

interface EczemaAnalyzer {
  /**
   * Compare two photos of the same type and return a trend assessment.
   * Photos are provided as decrypted Blobs (decryption happens before calling this port).
   */
  comparePhotos(
    photo1: Blob,
    photo2: Blob,
    context: AnalysisContext
  ): Promise<AnalysisResult>;

  /**
   * Analyze a single skin photo for severity assessment.
   */
  assessSeverity(
    photo: Blob,
    context: {
      bodyArea: string;
    }
  ): Promise<{
    severityScore: number;       // 1-5
    rednessScore: number;        // 1-10
    drynessScore: number;        // 1-10
    affectedAreaPct: number;     // 0-100
    description: string;
  }>;
}
```

### PhotoStorage

**File:** `src/lib/domain/ports/photo-storage.ts`

Responsible for storing and retrieving encrypted photo blobs.

```typescript
interface PhotoStorage {
  /**
   * Store an encrypted photo blob and return a reference ID.
   */
  upload(
    encryptedBlob: ArrayBuffer,
    metadata: { childId: string; date: string; bodyArea: string }
  ): Promise<{ blobRef: string }>;

  /**
   * Store an encrypted thumbnail blob.
   */
  uploadThumbnail(
    encryptedBlob: ArrayBuffer,
    blobRef: string
  ): Promise<{ thumbRef: string }>;

  /**
   * Retrieve an encrypted photo blob by its reference.
   */
  download(blobRef: string): Promise<ArrayBuffer>;

  /**
   * Retrieve an encrypted thumbnail by its reference.
   */
  downloadThumbnail(thumbRef: string): Promise<ArrayBuffer>;

  /**
   * Delete a photo and its thumbnail.
   */
  delete(blobRef: string): Promise<void>;

  /**
   * Get photos that have been captured locally but not yet uploaded to server.
   */
  getPendingUploads(): Promise<{ photoId: string; encryptedBlob: ArrayBuffer; encryptedThumb: ArrayBuffer; metadata: any }[]>;

  /**
   * Mark a photo as successfully uploaded to the server.
   */
  markUploaded(photoId: string): Promise<void>;
}
```

### DataRepository

**File:** `src/lib/domain/ports/repository.ts`

Responsible for persisting and querying all structured data (users, children, food logs, photo metadata, analysis results).

```typescript
interface DataRepository {
  // --- Users ---
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;

  // --- Children ---
  getChildrenForUser(userId: string): Promise<Child[]>;
  createChild(child: Omit<Child, 'id' | 'createdAt'>): Promise<Child>;
  linkUserToChild(userId: string, childId: string): Promise<void>;

  // --- Food Categories (read-only, seeded) ---
  getFoodCategories(): Promise<FoodCategory[]>;
  getFoodSubItems(categoryId: string): Promise<FoodSubItem[]>;

  // --- Food Logs ---
  getFoodLogs(childId: string, dateRange: { from: string; to: string }): Promise<FoodLog[]>;
  getFoodLogsForDate(childId: string, date: string): Promise<FoodLog[]>;
  createFoodLog(log: Omit<FoodLog, 'id' | 'createdAt'>): Promise<FoodLog>;
  deleteFoodLog(id: string): Promise<void>;

  /**
   * Returns the current elimination state for each food category:
   * which foods are currently eliminated vs. reintroduced,
   * based on the latest action for each category.
   */
  getCurrentEliminationState(childId: string): Promise<Map<string, 'eliminated' | 'reintroduced'>>;

  // --- Meals ---
  getMealsForDate(userId: string, date: string): Promise<Meal[]>;
  getMealWithItems(mealId: string): Promise<Meal & { items: MealItem[] } | null>;
  createMeal(meal: Omit<Meal, 'id' | 'createdAt' | 'updatedAt'>, items: Omit<MealItem, 'id'>[]): Promise<Meal>;
  updateMeal(id: string, updates: Partial<Meal>): Promise<Meal>;
  deleteMeal(id: string): Promise<void>;

  // --- Photos ---
  getPhotos(childId: string, dateRange: { from: string; to: string }): Promise<TrackingPhoto[]>;
  getPhotosForDate(childId: string, date: string): Promise<TrackingPhoto[]>;
  getPhotoById(id: string): Promise<TrackingPhoto | null>;
  createPhoto(photo: Omit<TrackingPhoto, 'id' | 'createdAt'>): Promise<TrackingPhoto>;
  deletePhoto(id: string): Promise<void>;

  // --- Analysis Results ---
  getAnalysisResults(childId: string): Promise<AnalysisResult[]>;
  getAnalysisForPhotoPair(photo1Id: string, photo2Id: string): Promise<AnalysisResult | null>;
  createAnalysisResult(result: Omit<AnalysisResult, 'id' | 'createdAt'>): Promise<AnalysisResult>;

  // --- Push Subscriptions ---
  getPushSubscriptions(userId: string): Promise<PushSubscription[]>;
  savePushSubscription(sub: Omit<PushSubscription, 'id' | 'createdAt'>): Promise<PushSubscription>;
  deletePushSubscription(id: string): Promise<void>;

  // --- Reminder Config ---
  getReminderConfig(userId: string, childId: string): Promise<ReminderConfig | null>;
  saveReminderConfig(config: ReminderConfig): Promise<void>;
}
```

### NotificationService

**File:** `src/lib/domain/ports/notifications.ts`

Responsible for sending push notifications to users.

```typescript
interface NotificationService {
  /**
   * Send a push notification to a specific user.
   */
  sendNotification(
    userId: string,
    payload: {
      title: string;
      body: string;
      url?: string;    // URL to open when notification is tapped
      tag?: string;    // Notification grouping tag
    }
  ): Promise<void>;

  /**
   * Send a reminder notification based on reminder configuration.
   * Called by the cron scheduler.
   */
  sendReminder(
    userId: string,
    childId: string,
    type: 'food_log' | 'photo'
  ): Promise<void>;

  /**
   * Check all reminder configs and send due notifications.
   * Called periodically by the server-side cron job.
   */
  processScheduledReminders(): Promise<void>;
}
```

---

## Adapter Implementations

### ClaudeVisionAnalyzer

**File:** `src/lib/adapters/claude-vision.ts`
**Implements:** `EczemaAnalyzer`

- Sends decrypted photo ArrayBuffers to the Claude Vision API as base64-encoded images.
- Constructs a prompt requesting structured comparison output (trend, scores, explanation).
- Parses Claude's response into the `AnalysisResult` format.
- Handles rate limiting and error retries.
- API key is stored as a server-side environment variable (`CLAUDE_API_KEY`). The client sends decrypted photos to `POST /api/analyze`, and the server forwards them to the Claude API. The key never reaches the client.

**Future alternatives:**
- `GptVisionAnalyzer` -- Same interface, calls OpenAI GPT-4 Vision.
- `LocalEczemaNetAnalyzer` -- Runs a custom ONNX model in the browser via WebNN/WASM.
- `MockAnalyzer` -- Returns random results for development and testing.

### EncryptedFSStorage

**File:** `src/lib/adapters/encrypted-storage.ts`
**Implements:** `PhotoStorage`

- Uploads encrypted blobs to the VPS via `POST /api/photos` (multipart/form-data).
- Downloads encrypted blobs via `GET /api/photos/:ref`.
- Server stores blobs in `/data/photos/` organized by `childId/date/`.
- The adapter itself does not handle encryption -- that is done before calling `upload()`.

**Future alternatives:**
- `S3Storage` -- Stores encrypted blobs in AWS S3 or Cloudflare R2.
- `LocalOnlyStorage` -- Stores blobs only in IndexedDB (no server upload, for offline-only mode).

### PostgresRepository

**File:** `src/lib/adapters/postgres.ts`
**Implements:** `DataRepository`

- Uses a PostgreSQL client (e.g., `postgres` or `pg` npm package) to execute SQL queries.
- Maps between snake_case database columns and camelCase TypeScript interfaces.
- Manages connection pooling.
- Runs on the server side only (called from `+server.ts` API routes).

**Future alternatives:**
- `SQLiteRepository` -- Uses better-sqlite3 or sql.js for a simpler single-file database.
- `InMemoryRepository` -- Stores everything in memory for testing.

### DexieLocalDB

**File:** `src/lib/adapters/dexie-db.ts`
**Implements:** Subset of `DataRepository` for client-side offline caching.

- Mirrors the server repository interface but operates on IndexedDB via Dexie.js.
- Caches food logs, photo metadata, and food categories locally.
- Stores encrypted photo blobs locally for offline viewing.
- Syncs with the server when connectivity is restored.

### WebPushNotifications

**File:** `src/lib/adapters/web-push.ts`
**Implements:** `NotificationService`

- Uses the `web-push` npm library on the server side to send VAPID-signed push messages.
- Reads push subscriptions from the `DataRepository`.
- Formats notification payloads with Czech text from the i18n module.
- Handles expired subscriptions (removes them from the database).
- The cron scheduler calls `processScheduledReminders()` at regular intervals.

**Future alternatives:**
- `EmailNotificationService` -- Sends reminders via email (e.g., Nodemailer + SMTP).
- `NoopNotificationService` -- Does nothing (for development or when notifications are disabled).

---

## How to Swap Adapters

Adapters are wired together in a central factory or configuration module. To swap an adapter:

### 1. Create the new adapter

Create a new file in `src/lib/adapters/` that implements the target port interface:

```typescript
// src/lib/adapters/gpt-vision.ts
import type { EczemaAnalyzer } from '$lib/domain/ports/analyzer';
import type { AnalysisResult } from '$lib/domain/models';

export class GptVisionAnalyzer implements EczemaAnalyzer {
  async comparePhotos(photo1, photo2, context): Promise<AnalysisResult> {
    // Call OpenAI GPT-4 Vision API instead of Claude
  }

  async assessSeverity(photo, context) {
    // ...
  }
}
```

### 2. Update the adapter factory

The adapter factory (e.g., `src/lib/adapters/index.ts`) is the single place where concrete adapters are instantiated and provided:

```typescript
// src/lib/adapters/index.ts
import { ClaudeVisionAnalyzer } from './claude-vision';
// import { GptVisionAnalyzer } from './gpt-vision';  // Uncomment to swap

import type { EczemaAnalyzer } from '$lib/domain/ports/analyzer';

export function createAnalyzer(): EczemaAnalyzer {
  return new ClaudeVisionAnalyzer();
  // return new GptVisionAnalyzer();  // Swap here
}
```

### 3. No changes needed in domain services or UI

The domain services receive their dependencies through the factory. They never import adapters directly, so swapping the factory return value is the only change needed.

### Environment-based adapter selection

For more flexibility, adapters can be selected based on environment variables:

```typescript
export function createAnalyzer(): EczemaAnalyzer {
  switch (env.ANALYZER_PROVIDER) {
    case 'claude': return new ClaudeVisionAnalyzer();
    case 'openai': return new GptVisionAnalyzer();
    case 'mock': return new MockAnalyzer();
    default: return new ClaudeVisionAnalyzer();
  }
}
```

---

## Dependency Flow Summary

```
UI Components
    |
    | import and call
    v
Domain Services (FoodTrackingService, PhotoDiaryService, ...)
    |
    | depend on (via constructor/factory injection)
    v
Port Interfaces (EczemaAnalyzer, PhotoStorage, DataRepository, ...)
    ^
    | implemented by
    |
Adapter Implementations (ClaudeVisionAnalyzer, PostgresRepository, ...)
```

The dependency arrows point inward: the domain layer has zero dependencies on the outer layers. The UI layer and adapters both depend on the domain layer (its interfaces and models), but never on each other.

---

## Adapter Wiring in SvelteKit

Adapters are wired differently on the server and client sides of SvelteKit:

### Server-Side Wiring (hooks.server.ts)

Server-only adapters (`PostgresRepository`, `WebPushNotifications`) are instantiated once at startup and attached to `event.locals` via SvelteKit hooks. Server routes and load functions access them via `locals`.

```typescript
// src/hooks.server.ts
import { PostgresRepository } from '$lib/adapters/postgres';
import { WebPushAdapter } from '$lib/adapters/web-push';

const repository = new PostgresRepository();
const notifications = new WebPushAdapter(repository);

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.repository = repository;
  event.locals.notifications = notifications;
  // ... session validation, auth guards
  return resolve(event);
};
```

Server routes then use:
```typescript
// src/routes/api/food-logs/+server.ts
export const GET: RequestHandler = async ({ locals }) => {
  const logs = await locals.repository.getFoodLogs(childId, dateRange);
  return json(logs);
};
```

### Client-Side Wiring (adapter factory)

Client-only adapters (`ClaudeVisionAnalyzer`, `DexieLocalDB`) are instantiated in a factory module and imported by domain services or UI components.

```typescript
// src/lib/adapters/index.ts (client-side factory)
import { ClaudeVisionAnalyzer } from './claude-vision';
import { DexieLocalDB } from './dexie-db';

// Client-side adapters — these call server API routes, never the database directly
export const analyzer = new ClaudeVisionAnalyzer();  // calls POST /api/analyze
export const localDB = new DexieLocalDB();           // Dexie.js (IndexedDB)
```

### Why Two Wiring Patterns

SvelteKit runs code in two contexts:
- **Server** (`+server.ts`, `+page.server.ts`, `hooks.server.ts`): has access to env vars, database, filesystem. Adapters that touch PostgreSQL or external APIs with secret keys live here.
- **Client** (`.svelte` files, `+page.ts`): runs in the browser. Adapters that use IndexedDB, Web Crypto, or call server API routes live here.

The domain services bridge both: `PhotoDiaryService` calls `PhotoStorage` (client-side, sends encrypted blob to server API) and `DataRepository` (server-side, stores metadata in PostgreSQL). The wiring ensures the right adapter is used in the right context.

---

## Error Handling Patterns

### Domain Service Errors

Domain services throw typed errors that the UI layer catches and maps to Czech user-facing messages:

```typescript
// src/lib/domain/errors.ts
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly userMessage: string  // Czech text for the UI
  ) {
    super(message);
  }
}

export class DecryptionError extends DomainError {
  constructor() {
    super('Decryption failed', 'DECRYPTION_FAILED', 'Nesprávné heslo');
  }
}

export class NetworkError extends DomainError {
  constructor(detail?: string) {
    super(`Network error: ${detail}`, 'NETWORK_ERROR',
      'Nelze se připojit. Zkuste to prosím později.');
  }
}

export class RateLimitError extends DomainError {
  constructor() {
    super('Rate limited', 'RATE_LIMITED',
      'Příliš mnoho požadavků. Počkejte chvíli.');
  }
}

export class ValidationError extends DomainError {
  constructor(field: string, messageCs: string) {
    super(`Validation failed: ${field}`, 'VALIDATION_ERROR', messageCs);
  }
}
```

### API Route Error Responses

Server API routes return structured JSON errors:

```typescript
// Pattern used in all +server.ts handlers
import { json, error } from '@sveltejs/kit';

// Throw SvelteKit error for standard HTTP errors
if (!locals.user) throw error(401, { message: 'Nepřihlášený' });
if (!isOwner) throw error(403, { message: 'Přístup odepřen' });

// Return validation errors as JSON
return json({ error: 'Datum je povinné', code: 'VALIDATION_ERROR' }, { status: 400 });
```

### UI Error Display

UI components catch domain errors and display them via a toast notification system:

```svelte
<!-- Pattern used in page components -->
<script lang="ts">
  import { DomainError } from '$lib/domain/errors';
  import { addToast } from '$lib/stores/toast.svelte';

  async function handleAction() {
    try {
      await someService.doSomething();
    } catch (e) {
      if (e instanceof DomainError) {
        addToast({ type: 'error', message: e.userMessage });
      } else {
        addToast({ type: 'error', message: 'Nastala neočekávaná chyba.' });
        console.error(e);
      }
    }
  }
</script>
```

---

## Logging Conventions

### Strategy

Use `pino` for structured JSON logging in production. In development, use `pino-pretty` for human-readable output.

### Log Levels

| Level | Usage | Examples |
|-------|-------|---------|
| `error` | Unrecoverable failures | Database connection lost, encryption failure, unhandled exception |
| `warn` | Degraded operation | Claude API rate limit hit, push notification delivery failed, slow query |
| `info` | Significant events | User login/logout, photo uploaded, sync completed, AI analysis requested |
| `debug` | Development details | SQL queries, API request/response shapes, cache hits/misses |

### What Must NEVER Be Logged

- Passwords or passphrase material
- Decrypted photo data or base64 image content
- Session tokens or cookie values
- API keys (CLAUDE_API_KEY, VAPID_PRIVATE_KEY, etc.)
- Google OAuth refresh tokens

### Request Correlation

Attach a unique `requestId` (UUID) to every incoming request via `hooks.server.ts`. Pass it through to all log calls so that all entries for a single request can be traced:

```typescript
// hooks.server.ts
event.locals.requestId = crypto.randomUUID();
```

### Setup

Install in Phase 0:
```bash
npm install pino
npm install -D pino-pretty
```
