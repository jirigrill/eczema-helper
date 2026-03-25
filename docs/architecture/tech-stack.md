# Technology Stack

This document describes every technology used in the Eczema Tracker PWA, the rationale behind each choice, version requirements, and alternatives that were considered.

---

## Full Stack Overview

| Layer | Technology | Why |
|---|---|---|
| Framework | SvelteKit 2 + Svelte 5 + TypeScript | Easiest to learn, smallest bundle, full-stack (SSR + API routes), runes for reactivity |
| Styling | Tailwind CSS 4 | Utility-first, mobile-first, no CSS files to manage |
| Local DB | Dexie.js 4 (IndexedDB) | Offline-first, stores data + encrypted photo blobs locally |
| Server DB | PostgreSQL 16 | Reliable, native `gen_random_uuid()`, JSON columns |
| DB client | postgres (postgres.js) | Modern, tagged template literals, lightweight |
| Photo storage | Encrypted files on VPS filesystem | Photos encrypted client-side before upload, stored as blobs |
| Encryption | Web Crypto API (AES-256-GCM) | E2E encryption in browser, server never sees plaintext photos |
| AI analysis | Claude Vision API (server-side proxy) | Server proxies client request to Claude API; API key stays server-side |
| Auth | Cookie-based sessions (30-day sliding) + bcrypt | Simple, secure, no OAuth complexity. Passkeys planned for Phase 8 |
| PWA | @vite-pwa/sveltekit | Service worker, manifest, offline caching |
| Push notifications | Web Push API + web-push (Node.js) | VAPID-based, works on iOS 16.4+ when installed to home screen |
| Charts | uPlot | Lightweight (~35KB), fast canvas rendering, ideal for mobile |
| PDF export | pdfmake | Generate pediatrician reports client-side |
| Testing | Vitest + @testing-library/svelte + Playwright | Fast unit/component tests, reliable E2E |
| Deployment | Node.js (adapter-node) + Nginx + Let's Encrypt | Standard VPS setup |

---

## Version Requirements

| Dependency | Minimum Version | Notes |
|---|---|---|
| Node.js | 20 LTS | Required for SvelteKit 2, native fetch, Web Crypto in Node |
| PostgreSQL | 16 | gen_random_uuid(), improved JSON performance |
| npm | 10+ | Ships with Node.js 20 |
| TypeScript | 5.3+ | Satisfies SvelteKit 2 requirements |
| SvelteKit | 2.x | Latest stable |
| Svelte | 5.x | Runes, fine-grained reactivity |
| Tailwind CSS | 4.x | New engine, CSS-first configuration |
| Dexie.js | 4.x | Improved TypeScript support, live queries |
| Docker | 24+ | Docker Compose V2 (integrated `docker compose`) |
| Nginx | 1.24+ | HTTP/2, modern TLS defaults |
| iOS Safari | 16.4+ | Required for PWA push notifications and home screen install |
| Android Chrome | 120+ | Full PWA support |

---

## Detailed Rationale and Alternatives Considered

### Framework: SvelteKit 2 + TypeScript

**Why SvelteKit:**
- Smallest learning curve among modern full-stack frameworks. Svelte's template syntax is close to plain HTML.
- Produces the smallest client bundles -- critical for a PWA that needs fast loading on mobile.
- Full-stack in one project: SSR pages, API routes (`+server.ts`), form actions, all with TypeScript.
- File-based routing with intuitive conventions (layouts, route groups, server-only files).
- Excellent PWA integration via `@vite-pwa/sveltekit`.
- Built on Vite, which provides fast HMR during development.

**Alternatives considered:**

| Alternative | Why rejected |
|---|---|
| Next.js 14 (React) | Larger bundle size, more boilerplate, React's complexity (hooks, useEffect pitfalls) adds learning overhead for a personal project |
| Nuxt 3 (Vue) | Viable option but larger ecosystem to learn; Vue's Composition API is more verbose than Svelte 5 runes |
| Remix | Excellent form handling but smaller ecosystem, less PWA tooling out of the box |
| Astro | Content-focused, not ideal for an interactive app with heavy client-side state |
| Plain React SPA + Express | No SSR, poor SEO (not important here but also loses SvelteKit's unified routing), more manual setup |

### Styling: Tailwind CSS 4

**Why Tailwind:**
- Mobile-first responsive design built into the utility classes.
- No context-switching between component files and CSS files.
- Tailwind 4's new engine is faster and uses CSS-first configuration (no `tailwind.config.js` required for basic setups).
- Excellent for building consistent UI quickly without a full component library.
- Small production CSS bundle due to automatic purging of unused utilities.

**Alternatives considered:**

| Alternative | Why rejected |
|---|---|
| Plain CSS / SCSS | More verbose, harder to maintain consistency, requires separate files |
| Skeleton UI / DaisyUI | Adds an abstraction layer on top of Tailwind; for a personal app, raw Tailwind is simpler |
| Svelte's scoped `<style>` | Good for component-specific styles but does not help with utility patterns and responsive design |
| UnoCSS | Compatible but smaller community, less documentation than Tailwind |

### Local Database: Dexie.js (IndexedDB)

**Why Dexie.js:**
- IndexedDB is the only browser API capable of storing large blobs (encrypted photos) offline.
- Dexie.js provides a clean Promise-based API over the raw IndexedDB API, which is callback-heavy and cumbersome.
- Live queries (Dexie 4) integrate well with Svelte stores for reactive UI updates.
- Enables true offline-first: users can log food changes and view cached photos without network.
- Schema versioning for database migrations built in.

**Alternatives considered:**

| Alternative | Why rejected |
|---|---|
| Raw IndexedDB | API is too low-level and verbose for practical use |
| localStorage | 5 MB limit, cannot store blobs, synchronous (blocks UI thread) |
| OPFS (Origin Private File System) | Good for files but poor query capabilities; could complement Dexie for raw photo blobs in the future |
| PouchDB + CouchDB sync | Adds CouchDB as another server dependency; too heavy for this use case |
| sql.js (SQLite in WASM) | Interesting but less mature for blob storage, no live queries |

### Server Database: PostgreSQL 16

**Why PostgreSQL:**
- Rock-solid reliability for a personal app that stores important medical tracking data.
- `gen_random_uuid()` for generating UUIDs without extensions.
- Excellent date/time handling -- critical for a calendar-based tracking app.
- JSON/JSONB columns available if needed for flexible data.
- `pgcrypto` extension available for any server-side encryption needs.
- Mature backup tooling (`pg_dump`, WAL archiving).
- Runs well in Docker with persistent volumes.

**Alternatives considered:**

| Alternative | Why rejected |
|---|---|
| SQLite | Simpler but harder to run in Docker alongside Node.js, no built-in UUID generation, less mature in concurrent access scenarios. Could be a future adapter though. |
| MongoDB | Document model is appealing but overkill; relational data (users, children, food logs) fits naturally into tables with foreign keys |
| MySQL / MariaDB | Viable but PostgreSQL has better date handling, UUID support, and JSON capabilities |
| Firebase Firestore | Violates self-hosting requirement; vendor lock-in; E2E encryption harder to implement correctly |
| Supabase | Built on PostgreSQL but adds cloud dependency; self-hosted Supabase is complex to operate |

### Photo Storage: Encrypted Files on VPS Filesystem

**Why filesystem storage:**
- Simplest approach: encrypted blobs are just files in a directory.
- No additional service to manage (no S3, no object storage).
- Easy to back up with `rsync` or `tar`.
- Photos are encrypted before upload, so filesystem permissions are defense-in-depth, not the only protection.

**Alternatives considered:**

| Alternative | Why rejected |
|---|---|
| PostgreSQL BYTEA columns | Bloats the database, makes backups slower and larger |
| MinIO (self-hosted S3) | Additional service to manage, overkill for a personal app with limited photos |
| AWS S3 / Cloudflare R2 | External dependency, costs money, violates self-hosting goal |
| Store in IndexedDB only | No server backup, data lost if phone is lost or browser storage cleared |

### Encryption: Web Crypto API (AES-256-GCM)

**Why Web Crypto API:**
- Native browser API, no JavaScript crypto libraries needed (which are slower and less auditable).
- AES-256-GCM provides authenticated encryption (confidentiality + integrity in one operation).
- PBKDF2 for key derivation is also available in Web Crypto API.
- Works on all target browsers (Safari 16.4+, Chrome 120+).
- E2E by design: the server stores opaque encrypted blobs and cannot decrypt them.

**Alternatives considered:**

| Alternative | Why rejected |
|---|---|
| libsodium.js (tweetnacl) | Good library but adds a dependency; Web Crypto API is already built into the browser |
| Server-side encryption only | Does not provide E2E -- server admin (self, in this case) could access photos; E2E is better practice for medical images |
| No encryption | Unacceptable for medical photos of a child |

### AI Analysis: Claude Vision API (server-side proxy)

**Why Claude Vision:**
- Strong visual understanding capabilities for comparing medical images.
- Can provide structured output (trend assessment, severity scores) alongside natural language explanation.
- Wrapped in an adapter interface (`EczemaAnalyzer`) so it can be swapped for a different model in the future.

**Why server-side proxy (not direct from client):**
- API key stays on the server, never exposed in the browser bundle or network requests.
- Single auditable point for all AI calls (logging, rate limiting).
- Client decrypts photos locally, sends them to `POST /api/analyze`, server forwards to Claude and streams the response back. Server holds plaintext images only in memory for the duration of the request, never writes to disk.
- This is the standard production pattern for external API calls from web apps.

**Alternatives considered:**

| Alternative | Why rejected |
|---|---|
| OpenAI GPT-4 Vision | Viable alternative; Claude chosen for personal preference and potentially better structured output. Could be added as a second adapter. |
| Local model (ONNX/TensorFlow.js) | No pre-trained eczema model exists; would require custom training with medical data, not feasible for a personal project |
| No AI analysis | Manual severity tracking only; AI comparison is a key feature that adds value |

### Authentication: Cookie-based Sessions + bcrypt

**Why simple auth:**
- Only two users (both parents). No need for OAuth providers, social login, or complex identity management.
- Cookie-based sessions are well-understood, secure by default with `httpOnly`, `secure`, and `sameSite` flags.
- bcrypt for password hashing is the proven standard.
- SvelteKit's `hooks.server.ts` makes session validation straightforward.

**Alternatives considered:**

| Alternative | Why rejected |
|---|---|
| OAuth (Google, Apple) | Adds external dependency, complexity, and privacy concern (Google knows you use an eczema tracker) |
| JWT tokens | Stateless JWTs are harder to invalidate; cookie sessions are simpler for a server-rendered app |
| Passkeys / WebAuthn | Planned for Phase 8 polish. Adds implementation complexity; deferred to after core features are stable |
| No auth (just encryption passphrase) | Need user identity for audit trails (who created which log entry) and push notification targeting |

### PWA: @vite-pwa/sveltekit

**Why @vite-pwa/sveltekit:**
- Official Vite PWA plugin with first-class SvelteKit integration.
- Generates the service worker, web manifest, and handles caching strategies.
- Supports Workbox under the hood for advanced caching (stale-while-revalidate, cache-first for images).
- Enables "Add to Home Screen" prompt and full-screen app experience.

### Push Notifications: Web Push API + web-push

**Why Web Push:**
- Works on iOS 16.4+ when the PWA is installed to the home screen.
- VAPID-based, no third-party push service needed (self-hosted).
- The `web-push` Node.js library handles VAPID signing and payload encryption.
- Ideal for reminders: "Did you log today's food changes?" or "Time for a photo update."

### Charts: uPlot

**Why uPlot:**
- Extremely lightweight (~35KB) compared to Chart.js (~200KB).
- Fast canvas-based rendering, performs well on mobile devices.
- Supports all chart types needed: line charts (severity over time), bar charts (food elimination timeline).
- Responsive and touch-friendly out of the box.

**Alternatives considered:**

| Alternative | Why rejected |
|---|---|
| Chart.js | ~200KB bundle size, overkill for 2-3 chart types in a mobile PWA |
| Custom SVG with Svelte | Smallest possible bundle but significantly more implementation effort for timeline/bar charts |
| Recharts | React-based, not compatible with Svelte |

### PDF Export: pdfmake

**Why pdfmake (client-side):**
- Photos are decrypted only on the client. Generating the PDF client-side means decrypted photos never need to go to the server.
- pdfmake provides table layouts, image embedding, and custom fonts needed for the pediatrician report.
- The PDF is handed directly to the parent to share with the pediatrician (via email, AirDrop, or print).

### PostgreSQL Client: postgres (postgres.js)

**Why postgres.js:**
- Modern, ESM-native library with tagged template literal API (`sql\`SELECT * FROM users WHERE id = ${id}\``).
- Automatic parameterization prevents SQL injection by design.
- Lightweight, fast connection pooling built in.
- First-class TypeScript support.

**Alternatives considered:**

| Alternative | Why rejected |
|---|---|
| pg (node-postgres) | Older callback/promise API, more verbose, heavier |
| Prisma / Drizzle | ORM adds abstraction layer; raw SQL with postgres.js is simpler for Ports & Adapters pattern |

### Testing: Vitest + @testing-library/svelte + Playwright

**Why this stack:**
- **Vitest** for unit and integration tests: built by the Vite team, native ESM, extremely fast parallel execution, same API as Jest (most examples work directly).
- **@testing-library/svelte** for component tests: test components from the user's perspective (render, query, interact), not implementation details.
- **Playwright** for E2E tests: multi-browser support (Chromium, WebKit/Safari, Firefox), reliable, excellent PWA testing capabilities.

**Alternatives considered:**

| Alternative | Why rejected |
|---|---|
| Jest | Slower, requires ESM transform configuration, heavier |
| Cypress | Heavier, no native WebKit/Safari support, overkill for a personal app |

### SvelteKit Adapter: adapter-node

**Why adapter-node:**
- The app is self-hosted on a VPS with Docker. `adapter-node` produces a standalone Node.js server that runs directly in the container.
- No serverless platform dependency (unlike `adapter-auto`, `adapter-vercel`, `adapter-cloudflare`).

### Deployment: Node.js + Nginx + Let's Encrypt

**Why self-hosted VPS:**
- Full control over data (medical images of a child).
- No cloud vendor lock-in or recurring SaaS costs beyond VPS hosting.
- Standard, well-documented setup: Nginx terminates HTTPS, proxies to Node.js, certbot auto-renews certificates.
- Docker Compose for reproducible deployment.

**Alternatives considered:**

| Alternative | Why rejected |
|---|---|
| Vercel / Netlify | Serverless functions have cold start issues; photo blob storage requires separate service; less control |
| Cloudflare Pages + Workers | Good performance but blob storage needs R2 (separate service), adds complexity |
| Fly.io | Interesting but adds cloud dependency; VPS is simpler for a single-user app |
| Bare metal (no Docker) | Docker provides reproducibility and easy PostgreSQL setup; worth the small overhead |
