# Phase 0: Project Scaffold & Dev Environment

## Summary

This phase establishes the entire foundation of the Eczema Tracker PWA. It creates the SvelteKit project, configures all build tooling (TypeScript, Tailwind CSS 4, Vite PWA plugin), defines the domain model interfaces and port abstractions following Ports & Adapters architecture, sets up the Dexie.js local database schema, builds the mobile app shell with bottom tab navigation, creates a login page (UI only), and provisions a local PostgreSQL instance via Docker Compose. By the end of this phase the app installs as a PWA on an iPhone and renders a navigable shell -- but has no working features yet.

## Prerequisites

None. This is the first phase.

## Features

1. Initialize a SvelteKit 2 project with TypeScript strict mode.
2. Configure Tailwind CSS 4 with a mobile-first design token palette.
3. Configure the PWA plugin (`@vite-pwa/sveltekit`) with app manifest, icons, and service worker.
4. Establish the full project directory structure (all folders and stub files).
5. Create domain model interfaces (`models.ts`) covering User, Session, Child, UserChild, FoodCategory, FoodSubItem, FoodLog, Meal, MealItem, TrackingPhoto, AnalysisResult, PushSubscription, ReminderConfig, GoogleDocConnection.
6. Create port interfaces for the hexagonal architecture: `DataRepository` (`repository.ts`), `EczemaAnalyzer` (`analyzer.ts`), `PhotoStorage` (`photo-storage.ts`), `NotificationService` (`notifications.ts`).
7. Set up the Dexie.js local database schema with tables mirroring domain models.
8. Create the app shell layout with a fixed bottom tab navigation bar (Calendar, Food, Photos, Trends, Settings).
9. Create a basic login page (UI only -- no backend wiring).
10. Provide a `docker-compose.dev.yml` for local PostgreSQL 16 + app container accessible on local network.
11. Set up mkcert for local HTTPS so phones on the WiFi network can access the app with trusted certificates.
12. Set up Caddy as a lightweight local HTTPS reverse proxy.
13. Verify the PWA installs on an iPhone via local network HTTPS (`https://192.168.x.x`).

## Acceptance Criteria

- [ ] **AC-1 (Feature 1):** Running `npm run dev` starts a SvelteKit dev server on `localhost:5173` without errors and TypeScript strict mode rejects `any` usage.
- [ ] **AC-2 (Feature 2):** Tailwind utility classes (e.g., `bg-blue-500`, `p-4`) render correctly in the browser; the Tailwind config file exports a theme with at least `primary`, `surface`, and `danger` custom colours.
- [ ] **AC-3 (Feature 3):** Navigating to `localhost:5173` in Chrome DevTools > Application tab shows a valid Web App Manifest with `name`, `short_name`, `start_url`, `display: standalone`, and at least two icon sizes (192x192, 512x512). A service worker is registered.
- [ ] **AC-4 (Feature 4):** The `src/` directory contains at minimum: `lib/domain/`, `lib/domain/ports/`, `lib/adapters/`, `lib/crypto/`, `lib/i18n/`, `lib/stores/`, `lib/components/`, `routes/`, `routes/login/`, `routes/(app)/`.
- [ ] **AC-5 (Feature 5):** `models.ts` exports TypeScript interfaces for `User`, `Session`, `Child`, `UserChild`, `FoodCategory`, `FoodSubItem`, `FoodLog`, `Meal`, `MealItem`, `TrackingPhoto`, `AnalysisResult` (discriminated union: `SkinAnalysisResult | StoolAnalysisResult`), `PushSubscription`, `ReminderConfig`, `GoogleDocConnection`. Each interface has an `id` field typed as `string`.
- [ ] **AC-6 (Feature 6):** Port files export interfaces: `DataRepository` (with entity-specific query methods per `ports-and-adapters.md`), `EczemaAnalyzer` (with `comparePhotos` and `assessSeverity` methods), `PhotoStorage` (with `upload`, `uploadThumbnail`, `download`, `downloadThumbnail`, `delete`), `NotificationService` (with `sendNotification`, `sendReminder`, `processScheduledReminders`).
- [ ] **AC-7 (Feature 7):** Importing the Dexie database instance and calling `db.open()` resolves without error. The database declares tables for `children`, `foodCategories`, `foodSubItems`, `foodLogs`, `meals`, `mealItems`, `trackingPhotos`, `analysisResults`.
- [ ] **AC-8 (Feature 8):** On a 375px-wide viewport the app shell renders a bottom navigation bar pinned to the bottom with exactly five tabs. Tapping each tab navigates to its route (`/calendar`, `/food`, `/photos`, `/trends`, `/settings`). The active tab is visually highlighted.
- [ ] **AC-9 (Feature 9):** Navigating to `/login` renders a form with an email input, a password input, and a submit button. The form does not submit to any backend.
- [ ] **AC-10 (Feature 10):** Running `docker compose -f docker-compose.dev.yml up -d` starts a PostgreSQL 16 container accessible on `localhost:5432` and the app container accessible on `0.0.0.0:3000`.
- [ ] **AC-11 (Feature 11):** mkcert is installed and a local certificate is generated covering `localhost`, `127.0.0.1`, and the laptop's LAN IP (e.g., `192.168.x.x`). The mkcert root CA is installed and trusted on the test iPhone.
- [ ] **AC-12 (Feature 12):** Caddy runs as a local HTTPS reverse proxy, serving `https://192.168.x.x` with the mkcert certificate and proxying to the app on port 3000 (or 5173 during dev).
- [ ] **AC-13 (Feature 13):** On an iPhone connected to the same WiFi, navigating to `https://192.168.x.x` in Safari shows the app without certificate warnings. Using "Add to Home Screen" installs the PWA, which opens in standalone mode (no Safari chrome).

## Implementation Details

### Files Created / Modified

| File | Description |
|---|---|
| `package.json` | Project metadata and all dependencies |
| `svelte.config.js` | SvelteKit adapter-node config with alias paths |
| `vite.config.ts` | Vite config with `@vite-pwa/sveltekit` plugin |
| `tailwind.config.ts` | Tailwind CSS 4 config with custom theme tokens |
| `tsconfig.json` | TypeScript strict mode configuration |
| `src/app.html` | Root HTML template with viewport meta for mobile |
| `src/app.css` | Global styles importing Tailwind directives |
| `src/lib/domain/models.ts` | All TypeScript interfaces for domain entities |
| `src/lib/domain/ports/repository.ts` | Repository port interface (CRUD for all entities) |
| `src/lib/domain/ports/analyzer.ts` | Analyzer port interface (correlation, suggestions) |
| `src/lib/domain/ports/photo-storage.ts` | Photo storage port interface |
| `src/lib/domain/ports/notifications.ts` | Notification scheduling port interface |
| `src/lib/crypto/encryption.ts` | Encryption module stub (AES-256-GCM, no implementation yet) |
| `src/lib/adapters/dexie-db.ts` | Dexie.js database schema and instance |
| `src/lib/i18n/cs.ts` | Czech translation strings (stub with basic keys) |
| `src/lib/stores/auth.svelte.ts` | Auth store stub (Svelte 5 runes, no logic) |
| `src/lib/stores/food-log.ts` | Food log store stub |
| `src/lib/stores/photos.ts` | Photos store stub |
| `src/lib/stores/children.ts` | Children store stub |
| `src/routes/+layout.svelte` | App shell with bottom tab navigation |
| `src/routes/+page.svelte` | Root page -- redirects to `/calendar` |
| `src/routes/login/+page.svelte` | Login page UI (email, password, submit button) |
| `src/routes/(app)/+layout.svelte` | Protected area layout (placeholder) |
| `src/routes/(app)/calendar/+page.svelte` | Calendar page placeholder |
| `src/routes/(app)/food/+page.svelte` | Food page placeholder |
| `src/routes/(app)/photos/+page.svelte` | Photos page placeholder |
| `src/routes/(app)/trends/+page.svelte` | Trends page placeholder |
| `src/routes/(app)/settings/+page.svelte` | Settings page placeholder |
| `static/manifest.webmanifest` | PWA manifest (name, icons, theme colour) |
| `static/icons/icon-192x192.png` | PWA icon 192px |
| `static/icons/icon-512x512.png` | PWA icon 512px |
| `docker-compose.dev.yml` | Local dev: PostgreSQL 16 + app container, LAN-accessible |
| `Dockerfile` | Multi-stage Node.js Dockerfile |
| `Caddyfile` | Local HTTPS reverse proxy config (mkcert certs) |
| `certs/` | Directory for mkcert-generated local TLS certificates (gitignored) |
| `.env.example` | Environment variable template |
| `.gitignore` | Updated to ignore `certs/`, `data/`, `.env` |

### Step-by-Step Instructions

#### Step 1: Create the SvelteKit project

```bash
npm create svelte@latest atopic_helper
# Select: Skeleton project, TypeScript, ESLint, Prettier
cd atopic_helper
```

#### Step 2: Install all dependencies

```bash
# Core
npm install dexie @vite-pwa/sveltekit

# Styling
npm install -D tailwindcss @tailwindcss/vite

# Auth (needed in Phase 1 but install now to avoid churn)
npm install bcryptjs
npm install -D @types/bcryptjs

# Database driver (needed in Phase 1)
npm install postgres

# Dev tools
npm install -D @sveltejs/adapter-node
```

#### Step 3: Configure Tailwind CSS 4

Create `src/app.css`:

```css
@import 'tailwindcss';

@theme {
  --color-primary: #4f7cac;
  --color-primary-light: #a0c4e8;
  --color-surface: #f8f9fa;
  --color-surface-dark: #e9ecef;
  --color-danger: #dc3545;
  --color-success: #28a745;
  --color-warning: #ffc107;
  --color-text: #212529;
  --color-text-muted: #6c757d;
}
```

Update `vite.config.ts` to include the Tailwind Vite plugin:

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      manifest: false, // use static/manifest.webmanifest
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}']
      }
    })
  ]
});
```

#### Step 4: Configure TypeScript strict mode

Ensure `tsconfig.json` includes:

```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

#### Step 5: Create the directory structure

```bash
mkdir -p src/lib/domain/ports
mkdir -p src/lib/adapters
mkdir -p src/lib/crypto
mkdir -p src/lib/i18n
mkdir -p src/lib/stores
mkdir -p src/lib/components/calendar
mkdir -p src/lib/components/food
mkdir -p src/lib/components/ui
mkdir -p src/routes/login
mkdir -p src/routes/\(app\)/calendar
mkdir -p src/routes/\(app\)/food
mkdir -p src/routes/\(app\)/photos
mkdir -p src/routes/\(app\)/trends
mkdir -p src/routes/\(app\)/settings
mkdir -p static/icons
```

#### Step 6: Create domain models (`src/lib/domain/models.ts`)

Define all interfaces exactly as specified in `docs/architecture/data-models.md`: `User`, `Session`, `Child`, `UserChild`, `FoodCategory`, `FoodSubItem`, `FoodLog`, `Meal`, `MealItem`, `TrackingPhoto`, `AnalysisResult` (discriminated union with `SkinAnalysisResult` and `StoolAnalysisResult`), `PushSubscription`, `ReminderConfig`, `GoogleDocConnection`. Every mutable interface must have `id: string`, `createdAt: string`, `updatedAt: string`. `FoodLog` and `TrackingPhoto` must also have `syncedAt?: string` for offline sync tracking.

#### Step 7: Create port interfaces

Create each port file under `src/lib/domain/ports/` exactly as specified in `docs/architecture/ports-and-adapters.md`:

- `repository.ts` -- `DataRepository` with entity-specific query methods: `getUserByEmail`, `getUserById`, `createUser`, `getChildrenForUser`, `createChild`, `linkUserToChild`, `getFoodCategories`, `getFoodSubItems`, `getFoodLogs`, `getFoodLogsForDate`, `createFoodLog`, `deleteFoodLog`, `getCurrentEliminationState`, `getPhotos`, `getPhotosForDate`, `getPhotoById`, `createPhoto`, `deletePhoto`, `getAnalysisResults`, `getAnalysisForPhotoPair`, `createAnalysisResult`, `getPushSubscriptions`, `savePushSubscription`, `deletePushSubscription`, `getReminderConfig`, `saveReminderConfig`.
- `analyzer.ts` -- `EczemaAnalyzer` with `comparePhotos(photo1: Blob, photo2: Blob, context: AnalysisContext): Promise<AnalysisResult>` and `assessSeverity(photo: Blob, context): Promise<SeverityAssessment>`.
- `photo-storage.ts` -- `PhotoStorage` with `upload(encryptedBlob, metadata): Promise<{ blobRef }>`, `uploadThumbnail(encryptedBlob, blobRef): Promise<{ thumbRef }>`, `download(blobRef): Promise<ArrayBuffer>`, `downloadThumbnail(thumbRef): Promise<ArrayBuffer>`, `delete(blobRef): Promise<void>`.
- `notifications.ts` -- `NotificationService` with `sendNotification(userId, payload): Promise<void>`, `sendReminder(userId, childId, type): Promise<void>`, `processScheduledReminders(): Promise<void>`.

#### Step 8: Create Dexie.js local database (`src/lib/adapters/dexie-db.ts`)

```typescript
import Dexie, { type Table } from 'dexie';
import type {
  Child, FoodCategory, FoodSubItem, FoodLog, Meal, MealItem,
  TrackingPhoto, AnalysisResult
} from '$lib/domain/models';

export class AtopicHelperDB extends Dexie {
  children!: Table<Child>;
  foodCategories!: Table<FoodCategory>;
  foodSubItems!: Table<FoodSubItem>;
  foodLogs!: Table<FoodLog>;
  meals!: Table<Meal>;
  mealItems!: Table<MealItem>;
  trackingPhotos!: Table<TrackingPhoto>;
  analysisResults!: Table<AnalysisResult>;

  constructor() {
    super('atopic-helper');
    this.version(1).stores({
      children: 'id',
      foodCategories: 'id, slug',
      foodSubItems: 'id, categoryId',
      foodLogs: 'id, childId, date, categoryId, [childId+date], syncedAt',
      meals: 'id, userId, date, [userId+date]',
      mealItems: 'id, mealId',
      trackingPhotos: 'id, childId, date, photoType, [childId+date], syncedAt',
      analysisResults: 'id, childId, [photo1Id+photo2Id]'
    });
  }
}

export const db = new AtopicHelperDB();
```

#### Step 9: Create stub files for stores, crypto, i18n

Each store file uses Svelte 5 runes in `.svelte.ts` modules (`auth.svelte.ts`, `food-log.svelte.ts`, `photos.svelte.ts`, `children.svelte.ts`). Each exports `$state` variables with getter/setter functions and `$derived` computed values. The crypto stub should export `encrypt` and `decrypt` async functions that throw "Not implemented" for now. The i18n stub should export a `cs` object with keys for common UI strings (`login`, `logout`, `register`, `calendar`, `food`, `photos`, `trends`, `settings`, `save`, `cancel`, `delete`, `loading`, `error`).

#### Step 10: Create the app shell layout (`src/routes/+layout.svelte`)

Build a mobile-first layout with:
- A `<main>` content area with `pb-16` (padding for bottom nav).
- A fixed bottom navigation bar with five tabs, each containing an icon (use simple SVG or Unicode symbols) and a label.
- Tabs: Calendar (`/calendar`), Food (`/food`), Photos (`/photos`), Trends (`/trends`), Settings (`/settings`).
- Active tab detection using `$page.url.pathname`.
- The navigation bar should only render on `(app)` routes, not on `/login`.

#### Step 11: Create the login page (`src/routes/login/+page.svelte`)

Build a centred card layout with:
- App logo / title at the top.
- Email input (`type="email"`, required).
- Password input (`type="password"`, required).
- "Log in" submit button (styled with Tailwind, disabled state).
- "Create account" link below the form.
- No form action or backend wiring -- just the UI.

#### Step 12: Create placeholder pages for each (app) route

Each placeholder page (`calendar`, `food`, `photos`, `trends`, `settings`) should render an `<h1>` with the page name and a `<p>` stating "Coming in Phase N".

#### Step 13: Create the root redirect (`src/routes/+page.svelte`)

Use `goto('/calendar')` in `onMount` or a `+page.server.ts` `load` function that throws a redirect to `/calendar`.

#### Step 14: Create PWA manifest (`static/manifest.webmanifest`)

```json
{
  "name": "Eczema Tracker",
  "short_name": "EczemaTrack",
  "description": "Track elimination diet for infant atopic eczema",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f8f9fa",
  "theme_color": "#4f7cac",
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Generate placeholder PNG icons (solid colour squares) for 192x192 and 512x512.

#### Step 15: Install mkcert and generate local certificates

```bash
# Install mkcert
brew install mkcert

# Install the root CA into macOS trust store
mkcert -install

# Find your laptop's local IP
LOCAL_IP=$(ipconfig getifaddr en0)
echo "Your local IP: $LOCAL_IP"

# Generate certificate for localhost + LAN IP
mkdir -p certs
mkcert -cert-file certs/local.pem -key-file certs/local-key.pem \
  localhost 127.0.0.1 $LOCAL_IP
```

Install the mkcert root CA on test phones:

**iPhone:**
1. Find CA: `mkcert -CAROOT` (e.g., `~/Library/Application Support/mkcert/rootCA.pem`)
2. AirDrop `rootCA.pem` to the iPhone
3. iPhone: Settings > General > VPN & Device Management > install the profile
4. iPhone: Settings > General > About > Certificate Trust Settings > enable full trust

**Android:**
1. Transfer `rootCA.pem` to the device
2. Settings > Security > Encryption & credentials > Install a certificate > CA certificate

#### Step 16: Create `docker-compose.dev.yml`

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: eczema-app-dev
    restart: unless-stopped
    ports:
      - "0.0.0.0:3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://atopic:atopic_dev@postgres:5432/atopic_helper
      - SESSION_SECRET=dev-secret-change-in-production
    volumes:
      - ./data/photos:/data/photos
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - internal

  postgres:
    image: postgres:16-alpine
    container_name: eczema-postgres-dev
    restart: unless-stopped
    environment:
      - POSTGRES_DB=atopic_helper
      - POSTGRES_USER=atopic
      - POSTGRES_PASSWORD=atopic_dev
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - pgdata-dev:/var/lib/postgresql/data
    networks:
      - internal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U atopic -d atopic_helper"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata-dev:

networks:
  internal:
    driver: bridge
```

#### Step 17: Create the Caddyfile

```
{
    auto_https off
}

https://192.168.1.42:443 {
    tls certs/local.pem certs/local-key.pem
    reverse_proxy localhost:3000
}

https://localhost:443 {
    tls certs/local.pem certs/local-key.pem
    reverse_proxy localhost:3000
}
```

Replace `192.168.1.42` with your actual LAN IP. Install Caddy:

```bash
brew install caddy
```

#### Step 18: Create `.env.example`

```
DATABASE_URL=postgres://atopic:atopic_dev@localhost:5432/atopic_helper
SESSION_SECRET=change-me-to-a-random-64-char-string
```

#### Step 19: Create the Dockerfile

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["node", "build"]
```

#### Step 20: Update .gitignore

Add these entries:

```
certs/
data/
.env
```

#### Step 21: Start the local dev environment

```bash
# Start Docker containers
docker compose -f docker-compose.dev.yml up -d

# Start Caddy for HTTPS (in a separate terminal)
caddy run --config Caddyfile

# Or during active development, use SvelteKit dev server:
npm run dev -- --host 0.0.0.0
# Update Caddyfile to proxy to localhost:5173 instead of :3000
```

#### Step 22: Update `app.html`

Ensure the `<head>` includes:
- `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">` for mobile.
- `<meta name="theme-color" content="#4f7cac">`.
- `<link rel="manifest" href="/manifest.webmanifest">`.
- `<meta name="apple-mobile-web-app-capable" content="yes">`.
- `<meta name="apple-mobile-web-app-status-bar-style" content="default">`.

### Key Code Patterns

**Domain model interface pattern:**

```typescript
// All timestamps are ISO strings. Mutable entities have updatedAt.
export interface Child {
  id: string;
  name: string;
  birthDate: string;     // ISO date: "2025-03-15"
  createdAt: string;
  updatedAt: string;
}

export interface FoodLog {
  id: string;
  childId: string;
  date: string;          // ISO date: "2025-04-01"
  categoryId: string;
  subItemId?: string;
  action: 'eliminated' | 'reintroduced';
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;     // null = pending offline upload
}
```

**Port interface pattern (hexagonal architecture — entity-specific methods, no generic CRUD):**

```typescript
export interface DataRepository {
  // Entity-specific methods — never expose table names or generic queries
  getUserByEmail(email: string): Promise<User | null>;
  getChildrenForUser(userId: string): Promise<Child[]>;
  createChild(child: Omit<Child, 'id' | 'createdAt' | 'updatedAt'>): Promise<Child>;
  getFoodLogs(childId: string, dateRange: { from: string; to: string }): Promise<FoodLog[]>;
  createFoodLog(log: Omit<FoodLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<FoodLog>;
  // ... see ports-and-adapters.md for the full interface
}
```

**Bottom navigation active tab detection:**

```typescript
import { page } from '$app/stores';

const tabs = [
  { href: '/calendar', label: 'Calendar', icon: 'calendar-icon' },
  { href: '/food', label: 'Food', icon: 'food-icon' },
  { href: '/photos', label: 'Photos', icon: 'photos-icon' },
  { href: '/trends', label: 'Trends', icon: 'trends-icon' },
  { href: '/settings', label: 'Settings', icon: 'settings-icon' }
];

$: activeTab = tabs.find(t => $page.url.pathname.startsWith(t.href));
```

## Post-Implementation State

The app shell runs on the developer's laptop in Docker and is accessible via HTTPS on the local network (`https://192.168.x.x`) through Caddy + mkcert. It displays a mobile-optimised layout with a fixed bottom navigation bar containing five tabs: Calendar, Food, Photos, Trends, and Settings. Each tab navigates to a placeholder page. The `/login` route renders a styled login form with email and password fields but no backend logic. The PWA can be installed on a real iPhone by navigating to the local HTTPS URL in Safari and using "Add to Home Screen" -- it opens in standalone mode (no browser chrome). PostgreSQL 16 is running locally via Docker Compose. All domain model interfaces and port abstractions are defined, and the Dexie.js local database schema is ready. Remote debugging is available via Safari Web Inspector (iPhone over USB) and Chrome DevTools (Android over USB). No features are functional yet -- this is purely the scaffold.

## Test Suite

### Unit Tests

**Test file: `src/lib/domain/models.test.ts`**

| # | Test Case | Details |
|---|---|---|
| 1 | `FoodLog.action` only accepts valid values | Create a FoodLog object with `action: 'eliminated'` and `action: 'reintroduced'` -- both should satisfy the type. Attempting to assign any other string should be a compile-time TypeScript error (verified via `tsc --noEmit`). |
| 2 | `TrackingPhoto.photoType` discriminates skin vs stool | Create a TrackingPhoto with `photoType: 'skin'` -- `bodyArea` and `severityManual` are available. With `photoType: 'stool'` -- `stoolColor`, `stoolConsistency`, `hasMucus`, `hasBlood` are available. |
| 3 | All model interfaces have required `id` field | For each model interface, instantiate a valid object and assert `id` is a string. |
| 4 | `FoodLog.date` is an ISO date string | Create a FoodLog and verify the `date` field matches `/^\d{4}-\d{2}-\d{2}$/`. |
| 5 | `AnalysisResult` discriminated union works | Create a `SkinAnalysisResult` with `analysisType: 'skin'` and verify skin-specific fields. Create a `StoolAnalysisResult` with `analysisType: 'stool'` and verify stool-specific fields. |

**Test file: `src/lib/adapters/dexie-db.test.ts`**

| # | Test Case | Details |
|---|---|---|
| 6 | Database opens without error | Call `db.open()` and assert it resolves. Call `db.close()` in teardown. |
| 7 | All expected tables exist | After opening, assert `db.tables.map(t => t.name)` contains `children`, `foodCategories`, `foodSubItems`, `foodLogs`, `meals`, `mealItems`, `trackingPhotos`, `analysisResults`. |
| 8 | FoodLogs compound index works | Insert a food log with `childId` and `date`, query using `.where('[childId+date]')`, assert the record is returned. |

**Test file: `src/lib/i18n/cs.test.ts`**

| # | Test Case | Details |
|---|---|---|
| 9 | Czech translations object has all required keys | Import `cs` and assert it contains keys: `login`, `logout`, `register`, `calendar`, `food`, `photos`, `trends`, `settings`, `save`, `cancel`, `delete`, `loading`, `error`. |
| 10 | No translation value is empty string | Iterate all values in `cs` and assert each is a non-empty string. |

**Test file: `src/lib/crypto/encryption.test.ts`**

| # | Test Case | Details |
|---|---|---|
| 11 | `encrypt` stub throws "Not implemented" | Call `encrypt(new Uint8Array([1,2,3]), 'key')` and assert it rejects with "Not implemented". |
| 12 | `decrypt` stub throws "Not implemented" | Call `decrypt(new Uint8Array([1,2,3]), 'key')` and assert it rejects with "Not implemented". |

### Integration Tests

**Test file: `tests/integration/docker-postgres.test.ts`**

| # | Test Case | Details |
|---|---|---|
| 13 | PostgreSQL container is reachable | Connect to `postgres://atopic:atopic_dev@localhost:5432/atopic_helper` using the `postgres` driver and run `SELECT 1`. Assert the result is `1`. |
| 14 | Database accepts table creation | Run `CREATE TABLE IF NOT EXISTS _test_healthcheck (id SERIAL PRIMARY KEY)` then `DROP TABLE _test_healthcheck`. Assert no errors. |
| 15 | Connection pool handles concurrent queries | Open 5 concurrent connections, each running `SELECT pg_sleep(0.1)`, assert all resolve within 2 seconds. |

### E2E / Manual Tests

**Test script: PWA Installation (iPhone via Local HTTPS)**

1. Ensure Docker containers are running: `docker compose -f docker-compose.dev.yml up -d`
2. Ensure Caddy is running: `caddy run --config Caddyfile`
3. Verify the mkcert root CA is installed and trusted on the iPhone (Settings > General > About > Certificate Trust Settings).
4. On the iPhone (connected to the same WiFi), open Safari and navigate to `https://192.168.x.x`.
5. **Expected:** The app loads without certificate warnings (mkcert is trusted).
6. Tap the Share button, then "Add to Home Screen".
7. Verify the app icon appears on the home screen.
8. Open the app from the home screen.
9. **Expected:** The app opens in standalone mode (no Safari address bar). The bottom navigation bar is visible with five tabs.
10. **Optional:** Connect iPhone via USB, open Safari on Mac > Develop > [device] to verify no console errors.

**Test script: Layout Rendering**

1. Open `http://localhost:5173` in Chrome.
2. Open DevTools and set viewport to 375x812 (iPhone size).
3. **Expected:** Bottom nav bar is pinned to the bottom. Five tabs are visible and evenly spaced.
4. Tap each tab in sequence.
5. **Expected:** Each tab navigates to its route and the active tab is visually highlighted (different colour or underline).
6. Navigate to `/login`.
7. **Expected:** The login form renders centred. The bottom navigation bar is NOT visible.

**Test script: Login Page UI**

1. Navigate to `/login`.
2. **Expected:** Email input, password input, and "Log in" button are visible.
3. Leave both fields empty and tap "Log in".
4. **Expected:** Browser native validation prevents submission (required fields).
5. Enter a valid email and password, tap "Log in".
6. **Expected:** Nothing happens (no backend). No console errors.

**Test script: Root Redirect**

1. Navigate to `http://localhost:5173/`.
2. **Expected:** The browser redirects to `/calendar`. The URL bar shows `/calendar`.

### Regression Checks

Since this is Phase 0 (the first phase), there are no prior phases to regress against. However, establish these baseline checks that must pass in every subsequent phase:

- [ ] `npm run dev` starts without errors.
- [ ] `npm run build` completes without errors.
- [ ] TypeScript compilation (`npx tsc --noEmit`) passes with zero errors.
- [ ] The PWA manifest is valid (check via Chrome DevTools > Application > Manifest).
- [ ] The service worker registers successfully.
- [ ] The bottom navigation bar renders correctly on a 375px viewport.
- [ ] The login page renders without console errors.
- [ ] `docker compose -f docker-compose.dev.yml up -d` starts PostgreSQL and the app, both accepting connections.
- [ ] `https://192.168.x.x` loads the app on a phone without certificate warnings.
- [ ] All Dexie.js tables (`children`, `foodCategories`, `foodSubItems`, `foodLogs`, `meals`, `mealItems`, `trackingPhotos`, `analysisResults`) are accessible after `db.open()`.
