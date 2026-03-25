# Project Structure

This document describes the complete directory tree of the Eczema Tracker PWA, with explanations of each directory and file's purpose. The project follows SvelteKit 2 conventions.

---

## Full Directory Tree

```
eczema-tracker/
├── src/
│   ├── lib/
│   │   ├── domain/
│   │   │   ├── models.ts              # All TypeScript types/interfaces
│   │   │   ├── ports/
│   │   │   │   ├── analyzer.ts        # EczemaAnalyzer interface
│   │   │   │   ├── photo-storage.ts   # PhotoStorage interface
│   │   │   │   ├── repository.ts      # DataRepository interface
│   │   │   │   └── notifications.ts   # NotificationService interface
│   │   │   └── services/
│   │   │       ├── food-tracking.ts   # Food elimination logic
│   │   │       ├── photo-diary.ts     # Photo management logic
│   │   │       ├── analysis.ts        # AI comparison orchestration
│   │   │       └── export.ts          # PDF report generation
│   │   ├── adapters/
│   │   │   ├── index.ts              # Adapter factory (wires implementations)
│   │   │   ├── claude-vision.ts       # Claude Vision API adapter
│   │   │   ├── encrypted-storage.ts   # E2E encrypted photo storage
│   │   │   ├── postgres.ts            # PostgreSQL adapter
│   │   │   ├── web-push.ts            # Web Push notifications
│   │   │   └── dexie-db.ts            # Local IndexedDB (offline)
│   │   ├── components/
│   │   │   ├── ui/                    # Shared: Button, Modal, Card, etc.
│   │   │   ├── calendar/             # Calendar grid, day cell, month nav
│   │   │   ├── food/                 # Food icons, category picker, sub-items
│   │   │   ├── photo/               # Camera capture, gallery, compare view
│   │   │   └── charts/              # Severity trend, correlation timeline
│   │   ├── stores/
│   │   │   ├── auth.ts               # Current user state
│   │   │   ├── food-log.ts           # Food elimination state
│   │   │   ├── photos.ts             # Photo diary state
│   │   │   └── children.ts           # Active child selection
│   │   ├── crypto/
│   │   │   └── encryption.ts         # AES-256-GCM encrypt/decrypt helpers
│   │   ├── i18n/
│   │   │   └── cs.ts                 # Czech translations
│   │   └── utils/
│   │       ├── date.ts               # Date formatting helpers
│   │       └── image.ts              # Image resize/compress before upload
│   ├── routes/
│   │   ├── +layout.svelte            # App shell: top-level layout
│   │   ├── +layout.server.ts         # Server-side session validation
│   │   ├── +page.svelte              # Redirect to /calendar
│   │   ├── login/
│   │   │   └── +page.svelte          # Login page
│   │   ├── (app)/                    # Auth-protected route group
│   │   │   ├── +layout.svelte        # Bottom navigation tabs
│   │   │   ├── +layout.server.ts     # Auth guard (redirect to /login if not authenticated)
│   │   │   ├── calendar/
│   │   │   │   └── +page.svelte      # Calendar view (main screen)
│   │   │   ├── food/
│   │   │   │   └── +page.svelte      # Food tracker for selected day
│   │   │   ├── photos/
│   │   │   │   ├── +page.svelte      # Photo gallery
│   │   │   │   ├── capture/
│   │   │   │   │   └── +page.svelte  # Camera + guidance overlay
│   │   │   │   └── compare/
│   │   │   │       └── +page.svelte  # Side-by-side + AI analysis
│   │   │   ├── trends/
│   │   │   │   └── +page.svelte      # Trends dashboard + correlation
│   │   │   ├── export/
│   │   │   │   └── +page.svelte      # PDF report generation
│   │   │   └── settings/
│   │   │       └── +page.svelte      # Profile, children, notifications
│   │   └── api/                       # Server API routes
│   │       ├── auth/
│   │       │   ├── login/+server.ts
│   │       │   ├── logout/+server.ts
│   │       │   └── register/+server.ts
│   │       ├── food-logs/+server.ts
│   │       ├── photos/+server.ts      # Upload/download encrypted blobs
│   │       ├── children/+server.ts
│   │       └── push/+server.ts        # Push subscription management
│   ├── app.html                       # HTML shell
│   ├── app.css                        # Global CSS (Tailwind directives)
│   └── hooks.server.ts               # Server hooks (session middleware)
├── static/
│   ├── manifest.webmanifest           # PWA manifest
│   ├── icons/                         # App icons (192, 512px)
│   └── sw.js                          # Service worker (generated by vite-pwa)
├── docker-compose.yml                 # PostgreSQL + app services
├── Dockerfile                         # Multi-stage build for Node.js app
├── nginx.conf                         # Nginx reverse proxy config
├── svelte.config.js                   # SvelteKit configuration
├── vite.config.ts                     # Vite + PWA plugin configuration
├── tailwind.config.ts                 # Tailwind CSS configuration
├── tsconfig.json                      # TypeScript configuration
├── package.json                       # Dependencies and scripts
└── .env.example                       # Environment variable template
```

---

## Directory Explanations

### `src/lib/domain/` -- Domain Layer

This is the core of the application. It contains all business logic and has zero dependencies on frameworks, databases, or APIs.

#### `src/lib/domain/models.ts`

All TypeScript interfaces and types used across the application: `User`, `Session`, `Child`, `UserChild`, `FoodCategory`, `FoodSubItem`, `FoodLog`, `Meal`, `MealItem`, `TrackingPhoto`, `AnalysisResult` (discriminated union: `SkinAnalysisResult | StoolAnalysisResult`), `PushSubscription`, `ReminderConfig`, `GoogleDocConnection`. This file is the single source of truth for data shapes. See [data-models.md](data-models.md) for the complete interface definitions.

#### `src/lib/domain/ports/`

Port interfaces define what the domain layer needs from the outside world, without specifying how:

| File | Interface | Purpose |
|---|---|---|
| `analyzer.ts` | `EczemaAnalyzer` | Compare photos, assess severity via AI |
| `photo-storage.ts` | `PhotoStorage` | Upload/download encrypted photo blobs |
| `repository.ts` | `DataRepository` | CRUD operations for all entities |
| `notifications.ts` | `NotificationService` | Send push notifications and process reminders |

#### `src/lib/domain/services/`

Business logic services that orchestrate operations using ports:

| File | Service | Responsibility |
|---|---|---|
| `food-tracking.ts` | `FoodTrackingService` | Log food eliminations and reintroductions, calculate current diet state, validate reintroduction timing |
| `photo-diary.ts` | `PhotoDiaryService` | Orchestrate photo capture workflow (resize, encrypt, upload, save metadata), retrieve and decrypt for viewing |
| `analysis.ts` | `AnalysisService` | Select photos for comparison, call AI analyzer, store results, aggregate trend data |
| `export.ts` | `ExportService` | Gather data for a date range, decrypt photos, generate PDF report with timeline and analysis |

### `src/lib/adapters/` -- Adapter Layer

Concrete implementations of port interfaces:

| File | Implements | Technology |
|---|---|---|
| `index.ts` | (factory) | Wires adapters together, provides `createAnalyzer()`, `createStorage()`, etc. |
| `claude-vision.ts` | `EczemaAnalyzer` | Anthropic Claude Vision API |
| `encrypted-storage.ts` | `PhotoStorage` | VPS filesystem via API routes |
| `postgres.ts` | `DataRepository` | PostgreSQL via `postgres` npm package |
| `web-push.ts` | `NotificationService` | Web Push API via `web-push` npm package |
| `dexie-db.ts` | subset of `DataRepository` | IndexedDB via Dexie.js for offline caching |

### `src/lib/components/` -- UI Components

Reusable Svelte components organized by feature area:

| Directory | Contents |
|---|---|
| `ui/` | Generic UI primitives: `Button.svelte`, `Modal.svelte`, `Card.svelte`, `LoadingSpinner.svelte`, `Toast.svelte`, `BottomSheet.svelte`. These know nothing about the domain. |
| `calendar/` | `CalendarGrid.svelte` (month view), `DayCell.svelte` (single day with status indicators), `MonthNav.svelte` (prev/next month). |
| `food/` | `FoodCategoryPicker.svelte` (grid of food category icons), `FoodSubItemList.svelte` (sub-items within a category), `FoodIcon.svelte` (individual food icon), `EliminationBadge.svelte` (eliminated/reintroduced status). |
| `photo/` | `CameraCapture.svelte` (camera access with guidance overlay), `PhotoGallery.svelte` (grid of thumbnails), `CompareView.svelte` (side-by-side comparison slider), `BodyAreaPicker.svelte` (select body region). |
| `charts/` | `SeverityTrend.svelte` (line chart of severity over time), `CorrelationTimeline.svelte` (food changes overlaid on severity), `FoodImpactSummary.svelte` (per-category impact assessment). |

### `src/lib/stores/` -- Svelte 5 Reactive State

Reactive state management using Svelte 5 runes (`$state`, `$derived`) in `.svelte.ts` modules:

| File | Purpose |
|---|---|
| `auth.svelte.ts` | Current authenticated user, login/logout state |
| `food-log.svelte.ts` | Food elimination logs for the selected child and date range, current elimination state |
| `photos.svelte.ts` | Photo metadata for the selected child, decrypted thumbnail cache |
| `children.svelte.ts` | List of children for the current user, currently active/selected child |
| `notification.svelte.ts` | Push notification permission and subscription state |
| `toast.svelte.ts` | Toast notification queue for error/success messages |

### `src/lib/crypto/`

#### `encryption.ts`

Client-side encryption utilities using the Web Crypto API:

- `deriveKey(passphrase, salt)` -- PBKDF2 key derivation from user passphrase
- `encrypt(data, key, aad?)` -- AES-256-GCM encryption with optional AAD, returns encrypted ArrayBuffer (IV prepended)
- `decrypt(data, key, aad?)` -- AES-256-GCM decryption with optional AAD, returns plaintext ArrayBuffer
- `generateSalt()` -- Cryptographically random salt generation

See [encryption.md](encryption.md) for the full encryption flow.

### `src/lib/i18n/`

#### `cs.ts`

Czech translation strings for the entire UI. Organized as a flat or nested object:

```typescript
export const cs = {
  nav: { calendar: 'Kalendář', food: 'Jídlo', photos: 'Fotky', trends: 'Trendy', settings: 'Nastavení' },
  food: { eliminated: 'Vyřazeno', reintroduced: 'Znovuzavedeno', ... },
  // ...
};
```

Since the app is Czech-only, there is no runtime language switching. A single translation file keeps all user-facing strings in one place for easy editing.

### `src/lib/utils/`

| File | Purpose |
|---|---|
| `date.ts` | Date formatting for Czech locale (`formatDate`, `formatRelative`, `getWeekDays`, `isSameDay`, etc.) |
| `image.ts` | Image processing before encryption: resize to max 1920px, compress to JPEG 80%, generate thumbnail (320px). Uses `<canvas>` API. |

---

## Route Structure

### `src/routes/`

SvelteKit uses file-based routing. Each directory under `routes/` maps to a URL path.

#### Root Layout and Page

| File | URL | Purpose |
|---|---|---|
| `+layout.svelte` | all pages | Root layout: loads fonts, global styles, initializes stores |
| `+layout.server.ts` | all pages | Server-side: loads session from cookie, passes user data to client |
| `+page.svelte` | `/` | Redirects to `/calendar` if authenticated, `/login` if not |

#### Login

| File | URL | Purpose |
|---|---|---|
| `login/+page.svelte` | `/login` | Login form (email + password) and registration link |

#### `(app)/` -- Auth-Protected Route Group

The parentheses in `(app)` make this a SvelteKit **route group**. It does not add a URL segment (so `/calendar` not `/(app)/calendar`) but allows a shared layout and server-side auth guard.

| File | Purpose |
|---|---|
| `(app)/+layout.svelte` | Bottom tab navigation bar (calendar, food, photos, trends, settings) |
| `(app)/+layout.server.ts` | Auth guard: checks session cookie, redirects to `/login` if not authenticated |

#### Pages Inside `(app)/`

| Route | File | Purpose |
|---|---|---|
| `/calendar` | `calendar/+page.svelte` | Main screen. Month calendar view showing daily status (food changes, photos taken, severity). Tap a day to see details. |
| `/food` | `food/+page.svelte` | Food tracker for the selected day. Shows all food categories with elimination/reintroduction status. Tap to toggle or add notes. |
| `/photos` | `photos/+page.svelte` | Photo gallery filtered by child and date range. Shows decrypted thumbnails in a grid. |
| `/photos/capture` | `photos/capture/+page.svelte` | Camera interface with guidance overlay (body area positioning guides). Captures photo, allows severity rating, then encrypts and uploads. |
| `/photos/compare` | `photos/compare/+page.svelte` | Select two photos for side-by-side comparison. Triggers AI analysis and displays results. |
| `/trends` | `trends/+page.svelte` | Dashboard with severity trend chart, food-eczema correlation timeline, and per-food impact summary. |
| `/export` | `export/+page.svelte` | PDF report generator. Select date range and content to include, preview, and export. |
| `/settings` | `settings/+page.svelte` | User profile, child management (add/edit children), notification preferences, encryption passphrase management. |

#### `api/` -- Server API Routes

SvelteKit `+server.ts` files define HTTP endpoints. These run server-side only.

| Route | Methods | Purpose |
|---|---|---|
| `api/auth/login/+server.ts` | POST | Validate credentials, create session cookie |
| `api/auth/logout/+server.ts` | POST | Clear session cookie |
| `api/auth/register/+server.ts` | POST | Create new user account |
| `api/food-logs/+server.ts` | GET, POST, DELETE | CRUD for food elimination logs |
| `api/photos/+server.ts` | GET, POST, DELETE | Upload/download encrypted photo blobs, photo metadata CRUD |
| `api/children/+server.ts` | GET, POST, PUT | Child management |
| `api/meals/+server.ts` | GET, POST, PUT, DELETE | Meal CRUD with meal items |
| `api/meals/[id]/+server.ts` | PUT, DELETE | Individual meal operations |
| `api/analyze/+server.ts` | POST | Server proxy to Claude Vision API for photo analysis |
| `api/analysis/+server.ts` | GET, POST | Analysis results CRUD |
| `api/analysis/[id]/+server.ts` | GET | Individual analysis result |
| `api/sync/push/+server.ts` | POST | Batch push of offline changes |
| `api/sync/pull/+server.ts` | GET | Delta sync pull (records since timestamp) |
| `api/auth/password/+server.ts` | PUT | Password change |
| `api/health/+server.ts` | GET | Health check endpoint |
| `api/google/+server.ts` | GET, POST, DELETE | Google OAuth and export |
| `api/push/+server.ts` | POST, DELETE | Push subscription registration and removal |

#### `app.html`

The HTML shell that SvelteKit injects the app into. Contains the `<head>` element with viewport meta tag (critical for mobile PWA), theme-color meta tag, and SvelteKit's `%sveltekit.head%` and `%sveltekit.body%` placeholders.

#### `hooks.server.ts`

Server hooks that run on every request:

- Parse the session cookie.
- Look up the session in the database (or in-memory store).
- Attach the authenticated user to `event.locals` so all server routes and `+layout.server.ts` files can access it.

---

## Static Assets

### `static/`

| File/Directory | Purpose |
|---|---|
| `manifest.webmanifest` | PWA manifest: app name ("Ekzem Tracker"), icons, theme color, display mode (`standalone`), start URL, scope |
| `icons/` | App icons in 192x192 and 512x512 sizes (PNG), plus Apple Touch Icon for iOS home screen |
| `sw.js` | Service worker, auto-generated by `@vite-pwa/sveltekit`. Handles offline caching via Workbox strategies. |

---

## Configuration Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | Defines two services: `app` (Node.js/SvelteKit) and `postgres` (PostgreSQL 16). See [deployment.md](deployment.md). |
| `Dockerfile` | Multi-stage build: stage 1 installs dependencies and builds the SvelteKit app, stage 2 runs the production Node.js server. |
| `nginx.conf` | Nginx reverse proxy configuration: HTTPS termination, proxy to Node.js, static file caching headers, security headers. |
| `svelte.config.js` | SvelteKit configuration: adapter-node for self-hosted deployment, path aliases (`$lib`). |
| `vite.config.ts` | Vite configuration: SvelteKit plugin, PWA plugin (`@vite-pwa/sveltekit`) with workbox caching strategies. |
| `tailwind.config.ts` | Tailwind CSS configuration: content paths, custom theme extensions (colors, fonts for Czech typography). |
| `tsconfig.json` | TypeScript configuration: strict mode, path aliases matching SvelteKit conventions. |
| `package.json` | Dependencies, dev dependencies, scripts (`dev`, `build`, `preview`, `db:migrate`, `db:seed`). |
| `.env.example` | Template for environment variables: `DATABASE_URL`, `SESSION_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CLAUDE_API_KEY`. |

---

## SvelteKit Conventions Used

### Route Groups with Parentheses

`(app)` is a route group. The parentheses mean the directory name is not included in the URL path. This allows multiple pages to share a layout (the bottom tab navigation) without adding a URL prefix. Routes inside `(app)/` are accessible at `/calendar`, `/food`, etc. -- not `/(app)/calendar`.

### Layouts

- `+layout.svelte` wraps all child routes with shared UI (navigation, auth checks).
- `+layout.server.ts` runs server-side before the layout renders, used for session validation and data loading.
- Layouts nest: the root `+layout.svelte` wraps `(app)/+layout.svelte`, which wraps individual pages.

### Server Routes

Files named `+server.ts` export HTTP method handlers (`GET`, `POST`, `PUT`, `DELETE`). These run exclusively on the server and are used for API endpoints. They receive a `RequestEvent` with access to `event.locals` (session data), `event.request` (the HTTP request), and `event.params` (URL parameters).

### Page Files

- `+page.svelte` -- The page component rendered in the browser.
- `+page.server.ts` -- Server-side load function for the page (data fetching before render).
- `+page.ts` -- Universal load function (runs on both server and client).

### The `$lib` Alias

SvelteKit provides the `$lib` alias that maps to `src/lib/`. All imports use this alias:

```typescript
import type { FoodLog } from '$lib/domain/models';
import { FoodTrackingService } from '$lib/domain/services/food-tracking';
import { Button } from '$lib/components/ui/Button.svelte';
```
