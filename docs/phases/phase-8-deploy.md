# Phase 8: Polish & Production Deployment

## Summary

This phase covers the final steps before the Eczema Tracker PWA goes live: a full Czech localization review, mobile UX testing focused on iPhone Safari, a custom PWA install prompt, production deployment using Docker Compose on an Ubuntu/Debian VPS with Nginx and Let's Encrypt HTTPS, an automated encrypted backup strategy for PostgreSQL and photo data, and a comprehensive verification pass covering offline-to-online sync and end-to-end encryption integrity.

## Prerequisites

- **All previous phases (0-7)** completed and working in development.
- A VPS (Ubuntu 22.04+ or Debian 12+) with root/sudo access, a public IP, and a domain name pointed to it via DNS A record.
- Docker and Docker Compose v2 installed on the VPS.
- A domain name (e.g., `ekzem.example.com`) with DNS configured.
- SSH access to the VPS.
- GPG key pair for backup encryption (or willingness to generate one).
- All environment variables documented and ready (database credentials, VAPID keys, session secrets, API keys).

## Features

1. **Czech localization review**: Complete audit of all UI strings, error messages, notifications, and PDF export text. Centralized translation file.
2. **Mobile UX testing on iPhone Safari**: Responsive layout verification across iPhone models, touch interaction testing, PWA-specific behavior checks.
3. **PWA install flow**: Custom install prompt using `beforeinstallprompt` event with Czech UI, iOS-specific "Add to Home Screen" instructions.
4. **Nginx configuration**: Reverse proxy to the SvelteKit app, HTTPS termination with Let's Encrypt, security headers, gzip compression.
5. **Docker deployment**: Multi-stage Dockerfile, docker-compose.yml with app and PostgreSQL services, persistent volumes.
6. **Backup strategy**: Automated daily encrypted PostgreSQL dumps, photo directory backup, retention policy (7 daily + 4 weekly).
7. **Offline-to-online sync verification**: End-to-end testing of the Dexie sync mechanism under various network conditions.
8. **Encryption verification**: Confirm that photo blobs stored on the server are genuinely encrypted and unreadable without client-side keys.
9. **WebAuthn / Passkeys (optional)**: Add Face ID / Touch ID login as an alternative to password. Uses the Web Authentication API. Passkey enrollment available in Settings after initial password-based account creation. This feature is optional for Phase 8 and can be deferred if time-constrained.

## Acceptance Criteria

1. Every user-visible string in the application is in Czech, with no English fallbacks visible in normal usage.
2. The application renders correctly and is fully functional on iPhone SE (2nd gen), iPhone 12, iPhone 14, and iPhone 15 Pro Max in Safari and as an installed PWA.
3. On Android/desktop browsers that support `beforeinstallprompt`, a custom Czech install banner appears prompting the user to install the app.
4. On iOS Safari, a manual installation instruction overlay is shown (since iOS does not fire `beforeinstallprompt`).
5. The app is accessible via HTTPS at the configured domain with a valid Let's Encrypt certificate that auto-renews.
6. `docker-compose up -d` starts the app and database containers, and the app responds to requests within 30 seconds.
7. Nginx serves the app with security headers: `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, `Referrer-Policy`.
8. Daily backups run at 02:00 via cron, producing GPG-encrypted PostgreSQL dumps in `/backups/`.
9. Backup retention: 7 most recent daily backups and 4 most recent weekly backups (Sunday) are kept; older backups are deleted.
10. A backup restore procedure is documented and tested: a fresh database can be restored from an encrypted dump.
11. Creating data offline, then reconnecting, results in that data syncing to the server within 60 seconds.
12. Inspecting photo blobs stored on the server filesystem (`/data/photos/`) or in the database confirms they are encrypted (not valid image files).
13. Server logs do not contain plaintext photo data, user passwords, or encryption keys.

## Implementation Details

### Files Created / Modified

| File                                      | Action | Purpose                                                  |
| ----------------------------------------- | ------ | -------------------------------------------------------- |
| `Dockerfile`                              | Create | Multi-stage build for SvelteKit Node adapter             |
| `docker-compose.yml`                      | Create | Production services: app + PostgreSQL                    |
| `docker-compose.override.yml`             | Create | Development overrides (optional, for local Docker usage) |
| `nginx/nginx.conf`                        | Create | Nginx reverse proxy configuration with HTTPS             |
| `scripts/backup.sh`                       | Create | Automated encrypted PostgreSQL backup script             |
| `scripts/restore.sh`                      | Create | Backup restoration script                                |
| `scripts/deploy.sh`                       | Create | Deployment automation script                             |
| `scripts/setup-server.sh`                 | Create | Initial server setup (Docker, Nginx, certbot)            |
| `.env.example`                            | Modify | Complete list of all required environment variables      |
| `src/lib/i18n/cs.ts`                      | Create | Centralized Czech translation strings                    |
| `src/lib/components/InstallPrompt.svelte` | Create | Custom PWA install prompt component                      |
| `src/lib/stores/install.ts`               | Create | PWA install prompt state management                      |

### Step-by-Step Instructions

#### Step 1: Create the Centralized Czech Translation File

Create `src/lib/i18n/cs.ts`:

```typescript
export const cs = {
  // Navigation
  nav: {
    home: "Prehled",
    foodLog: "Zaznam jidla",
    photos: "Fotky",
    analysis: "Analyza",
    trends: "Trendy",
    export: "Export",
    settings: "Nastaveni",
    logout: "Odhlasit se",
  },

  // Auth
  auth: {
    login: "Prihlaseni",
    register: "Registrace",
    email: "E-mail",
    password: "Heslo",
    confirmPassword: "Potvrzeni hesla",
    loginButton: "Prihlasit se",
    registerButton: "Registrovat se",
    forgotPassword: "Zapomenute heslo?",
    noAccount: "Nemate ucet?",
    hasAccount: "Uz mate ucet?",
    errors: {
      invalidCredentials: "Neplatne prihlasovaci udaje",
      emailRequired: "E-mail je povinny",
      passwordRequired: "Heslo je povinne",
      passwordMismatch: "Hesla se neshoduji",
      passwordTooShort: "Heslo musi mit alespon 8 znaku",
      emailTaken: "Tento e-mail je jiz registrovany",
    },
  },

  // Food log
  foodLog: {
    title: "Zaznam jidla",
    addEntry: "Pridat zaznam",
    date: "Datum",
    time: "Cas",
    foods: "Potraviny",
    notes: "Poznamky",
    eliminated: "Eliminovane",
    reintroduced: "Znovuzavedene",
    save: "Ulozit",
    cancel: "Zrusit",
    delete: "Smazat",
    confirmDelete: "Opravdu chcete smazat tento zaznam?",
    noEntries: "Zatim zadne zaznamy. Pridejte prvni zaznam jidla.",
    todayReminder: "Zaznamenala jsi dnes jidlo?",
  },

  // Photos
  photos: {
    title: "Fotky",
    capture: "Vyfotit",
    bodyArea: "Oblast tela",
    severity: "Zavaznost",
    date: "Datum",
    noPhotos: "Zatim zadne fotky.",
    bodyAreas: {
      face: "Oblicej",
      arms: "Paze",
      legs: "Nohy",
      torso: "Trup",
      hands: "Ruce",
      feet: "Chodidla",
      neck: "Krk",
      scalp: "Pokozka hlavy",
    },
  },

  // Analysis
  analysis: {
    title: "AI analyza",
    runAnalysis: "Spustit analyzu",
    analyzing: "Analyzuji...",
    noAnalyses: "Zatim zadne analyzy.",
    trends: {
      improving: "Zlepseni",
      stable: "Stabilni",
      worsening: "Zhorseni",
    },
  },

  // Trends
  trends: {
    title: "Trendy",
    severityOverTime: "Zavaznost v case",
    byBodyArea: "Podle oblasti tela",
    noData: "Nedostatek dat pro zobrazeni trendu.",
  },

  // Export
  export: {
    title: "Export pro lekare",
    dateFrom: "Od",
    dateTo: "Do",
    generate: "Generovat PDF",
    generating: "Generuji...",
    download: "Stahnout PDF",
    share: "Sdilet",
    print: "Tisknout",
    includeAi: "Zahrnout AI analyzy",
    notes: "Poznamky pro lekare",
    noData: "Pro zvolene obdobi nejsou k dispozici zadna data.",
    reportTitle: "Zprava o prubehu ekzemu",
    footer: "Generovano aplikaci Eczema Tracker",
  },

  // Settings
  settings: {
    title: "Nastaveni",
    children: "Deti",
    addChild: "Pridat dite",
    childName: "Jmeno",
    birthDate: "Datum narozeni",
    notifications: "Notifikace",
    enableNotifications: "Povolit notifikace",
    disableNotifications: "Vypnout notifikace",
    foodLogReminder: "Pripominky zaznamu jidla",
    foodLogReminderTime: "Cas pripominky",
    photoReminder: "Pripominky fotek",
    photoReminderInterval: "Interval (dny)",
    photoReminderTime: "Cas pripominky",
    iosNotificationNote:
      'Pro prijem notifikaci na iOS je nutne nainstalovat aplikaci na domovskou obrazovku. Klepnete na ikonu Sdileni a vyberte "Pridat na plochu".',
    notificationsUnsupported:
      "Notifikace nejsou na tomto zarizeni podporovany.",
    save: "Ulozit",
  },

  // Install prompt
  install: {
    title: "Nainstalovat Eczema Tracker",
    description:
      "Nainstalujte si aplikaci pro rychlejsi pristup a offline pouziti.",
    installButton: "Nainstalovat",
    dismissButton: "Pozdeji",
    iosInstructions:
      'Pro instalaci klepnete na {shareIcon} a vyberte "Pridat na plochu".',
  },

  // Common
  common: {
    save: "Ulozit",
    cancel: "Zrusit",
    delete: "Smazat",
    edit: "Upravit",
    back: "Zpet",
    loading: "Nacitani...",
    error: "Doslo k chybe. Zkuste to prosim znovu.",
    offline: "Jste offline. Data budou synchronizovana po pripojeni.",
    syncing: "Synchronizuji...",
    synced: "Synchronizovano",
  },
} as const;

export type TranslationKey = keyof typeof cs;
```

Audit all existing Svelte components, server-side error messages, and notification payloads. Replace hardcoded Czech strings with references to `cs.*` from this file. This centralizes all translations and makes future localization changes straightforward.

#### Step 2: Create the Custom PWA Install Prompt

Create `src/lib/stores/install.svelte.ts`:

```typescript
// src/lib/stores/install.svelte.ts (Svelte 5 runes)
let canInstall = $state(false);
let isInstalled = $state(false);
let showPrompt = $state(false);
let deferredPrompt = $state<any>(null);

export function getCanInstall() {
  return canInstall;
}
export function getIsInstalled() {
  return isInstalled;
}
export function getShowPrompt() {
  return showPrompt;
}

export function init() {
  if (typeof window === "undefined") return;

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true;

  if (isStandalone) {
    isInstalled = true;
    return;
  }

  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    canInstall = true;
    deferredPrompt = e;
    showPrompt = !sessionStorage.getItem("installDismissed");
  });

  window.addEventListener("appinstalled", () => {
    canInstall = false;
    isInstalled = true;
    showPrompt = false;
    deferredPrompt = null;
  });
}

export async function promptInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      canInstall = false;
      isInstalled = true;
      showPrompt = false;
      deferredPrompt = null;
    }
  }
}

export function dismiss() {
  sessionStorage.setItem("installDismissed", "true");
  showPrompt = false;
}
```

Create `src/lib/components/InstallPrompt.svelte`:

```svelte
<script lang="ts">
    import { installStore } from '$lib/stores/install';
    import { cs } from '$lib/i18n/cs';
    import { isIOS, isStandalonePWA } from '$lib/utils/ios-detection';
    import { onMount } from 'svelte';

    let showIosPrompt = false;

    onMount(() => {
        installStore.init();
        // On iOS (not installed), show manual instructions
        showIosPrompt = isIOS() && !isStandalonePWA();
    });
</script>

{#if $installStore.showPrompt}
    <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
        <div class="max-w-md mx-auto">
            <h3 class="font-bold text-lg">{cs.install.title}</h3>
            <p class="text-gray-600 text-sm mt-1">{cs.install.description}</p>
            <div class="flex gap-3 mt-3">
                <button
                    on:click={() => installStore.promptInstall()}
                    class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium"
                >
                    {cs.install.installButton}
                </button>
                <button
                    on:click={() => installStore.dismiss()}
                    class="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium"
                >
                    {cs.install.dismissButton}
                </button>
            </div>
        </div>
    </div>
{:else if showIosPrompt}
    <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
        <div class="max-w-md mx-auto text-center">
            <p class="text-gray-600 text-sm">
                Pro instalaci klepnete na
                <svg class="inline w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
                    <polyline points="16 6 12 2 8 6"/>
                    <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
                a vyberte "Pridat na plochu".
            </p>
            <button
                on:click={() => showIosPrompt = false}
                class="text-blue-600 text-sm mt-2"
            >
                Rozumim
            </button>
        </div>
    </div>
{/if}
```

Add the `<InstallPrompt />` component to the root layout (`src/routes/(app)/+layout.svelte`).

#### Step 3: Create the Dockerfile

Create `Dockerfile` in the project root:

```dockerfile
# Stage 1: Build
FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Stage 2: Production
FROM oven/bun:1-slim

WORKDIR /app

# Install only production dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Copy built application
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./

# Copy migration scripts
COPY migrations ./migrations

# Create data directories
RUN mkdir -p /data/photos

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "build/index.js"]
```

#### Step 4: Create Docker Compose Configuration

Create `docker-compose.yml`:

```yaml
version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: eczema-tracker-app
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      - DATABASE_URL=postgresql://eczema:${POSTGRES_PASSWORD}@postgres:5432/eczema_tracker
      - NODE_ENV=production
      - ORIGIN=${ORIGIN}
      - VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
      - VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
      - VAPID_SUBJECT=${VAPID_SUBJECT}
      - SESSION_SECRET=${SESSION_SECRET}
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
    volumes:
      - photo-data:/data/photos
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - app-network

  postgres:
    image: postgres:16-alpine
    container_name: eczema-tracker-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=eczema_tracker
      - POSTGRES_USER=eczema
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - pg-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U eczema -d eczema_tracker"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

volumes:
  pg-data:
  photo-data:

networks:
  app-network:
    driver: bridge
```

#### Step 5: Create Nginx Configuration

Create `nginx/nginx.conf`:

```nginx
server {
    listen 80;
    server_name ekzem.example.com;

    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}

server {
    listen 443 ssl http2;
    server_name ekzem.example.com;

    # SSL certificates (managed by certbot)
    ssl_certificate /etc/letsencrypt/live/ekzem.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ekzem.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; worker-src 'self'; manifest-src 'self';" always;
    add_header Permissions-Policy "camera=(self), microphone=(), geolocation=()" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript application/wasm image/svg+xml;

    # Client body size (for photo uploads)
    client_max_body_size 20M;

    # Proxy to SvelteKit app
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Cache static assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|webmanifest)$ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service worker must not be cached
    location = /sw.js {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
}
```

Install Nginx and certbot on the VPS (not inside Docker), then symlink or copy this config to `/etc/nginx/sites-enabled/`.

#### Step 6: Create the Backup Script

Create `scripts/backup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Configuration
BACKUP_DIR="/backups"
PHOTO_DIR="/data/photos"
PHOTO_BACKUP_DIR="/backups/photos"
DB_CONTAINER="eczema-tracker-db"
DB_NAME="eczema_tracker"
DB_USER="eczema"
GPG_RECIPIENT="your-gpg-key-id"  # Replace with your GPG key ID
DAILY_RETENTION=7
WEEKLY_RETENTION=4
DATE=$(date +%Y-%m-%d)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directories
mkdir -p "${BACKUP_DIR}/daily"
mkdir -p "${BACKUP_DIR}/weekly"
mkdir -p "${PHOTO_BACKUP_DIR}"

echo "[$(date)] Starting backup..."

# --- PostgreSQL dump ---
echo "[$(date)] Dumping PostgreSQL..."
docker exec "${DB_CONTAINER}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --format=custom \
    | gpg --encrypt --recipient "${GPG_RECIPIENT}" \
    > "${BACKUP_DIR}/daily/db_${TIMESTAMP}.dump.gpg"

echo "[$(date)] Database backup created: db_${TIMESTAMP}.dump.gpg"

# --- Photo backup (rsync encrypted blobs) ---
echo "[$(date)] Syncing photo directory..."
rsync -a --delete "${PHOTO_DIR}/" "${PHOTO_BACKUP_DIR}/"

echo "[$(date)] Photo backup synced."

# --- Weekly backup (copy on Sundays) ---
if [ "${DAY_OF_WEEK}" -eq 7 ]; then
    cp "${BACKUP_DIR}/daily/db_${TIMESTAMP}.dump.gpg" "${BACKUP_DIR}/weekly/db_${TIMESTAMP}.dump.gpg"
    echo "[$(date)] Weekly backup created."
fi

# --- Retention: remove old daily backups ---
echo "[$(date)] Cleaning old daily backups (keeping ${DAILY_RETENTION})..."
ls -t "${BACKUP_DIR}/daily/"db_*.dump.gpg 2>/dev/null | tail -n +$((DAILY_RETENTION + 1)) | xargs -r rm -f

# --- Retention: remove old weekly backups ---
echo "[$(date)] Cleaning old weekly backups (keeping ${WEEKLY_RETENTION})..."
ls -t "${BACKUP_DIR}/weekly/"db_*.dump.gpg 2>/dev/null | tail -n +$((WEEKLY_RETENTION + 1)) | xargs -r rm -f

echo "[$(date)] Backup completed successfully."
```

Make it executable and add to cron:

```bash
chmod +x scripts/backup.sh
# Add to root's crontab:
# MAILTO=admin@example.com
# 0 2 * * * /opt/eczema-tracker/scripts/backup.sh >> /var/log/eczema-backup.log 2>&1
```

### External Monitoring

Set up an external uptime monitor (free tier of UptimeRobot, Hetrix, or similar):

- Ping `GET /api/health` every 5 minutes
- Send email/push alerts on 2 consecutive failures
- This catches scenarios where the entire VPS is down (which Docker's internal healthcheck cannot detect)

**Backup failure alerting:** Add `MAILTO=admin@example.com` to the cron configuration so backup script failures send an email notification.

#### Step 7: Create the Restore Script

Create `scripts/restore.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Usage: ./restore.sh /path/to/backup.dump.gpg

if [ $# -ne 1 ]; then
    echo "Usage: $0 <backup-file.dump.gpg>"
    exit 1
fi

BACKUP_FILE="$1"
DB_CONTAINER="eczema-tracker-db"
DB_NAME="eczema_tracker"
DB_USER="eczema"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

echo "WARNING: This will replace the current database with the backup."
echo "Database: ${DB_NAME}"
echo "Backup file: ${BACKUP_FILE}"
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo "[$(date)] Decrypting backup..."
TEMP_DUMP=$(mktemp /tmp/eczema_restore_XXXXXX.dump)
gpg --decrypt "${BACKUP_FILE}" > "${TEMP_DUMP}"

echo "[$(date)] Stopping app container..."
docker stop eczema-tracker-app || true

echo "[$(date)] Dropping and recreating database..."
docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

echo "[$(date)] Restoring database..."
docker exec -i "${DB_CONTAINER}" pg_restore -U "${DB_USER}" -d "${DB_NAME}" < "${TEMP_DUMP}"

echo "[$(date)] Cleaning up..."
rm -f "${TEMP_DUMP}"

echo "[$(date)] Starting app container..."
docker start eczema-tracker-app

echo "[$(date)] Restore completed successfully."
```

#### Step 8: Create the Deployment Script

Create `scripts/deploy.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/opt/eczema-tracker"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.yml"

echo "[$(date)] Starting deployment..."

cd "${PROJECT_DIR}"

# Pull latest code
echo "[$(date)] Pulling latest changes..."
git pull origin main

# Build and restart containers
echo "[$(date)] Building and restarting containers..."
docker compose -f "${COMPOSE_FILE}" build --no-cache app
docker compose -f "${COMPOSE_FILE}" up -d

# Wait for health check
echo "[$(date)] Waiting for app to become healthy..."
RETRIES=30
for i in $(seq 1 $RETRIES); do
    if curl -sf http://127.0.0.1:3000/api/health > /dev/null 2>&1; then
        echo "[$(date)] App is healthy."
        break
    fi
    if [ "$i" -eq "$RETRIES" ]; then
        echo "[$(date)] ERROR: App did not become healthy within timeout."
        docker compose -f "${COMPOSE_FILE}" logs --tail=50 app
        exit 1
    fi
    sleep 2
done

# Run database migrations
echo "[$(date)] Running database migrations..."
docker compose -f "${COMPOSE_FILE}" exec app node build/migrate.js

# Reload Nginx (in case config changed)
echo "[$(date)] Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "[$(date)] Deployment completed successfully."
```

#### Step 9: Create the Server Setup Script

Create `scripts/setup-server.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Initial server setup for Ubuntu 22.04+ / Debian 12+
# Run as root or with sudo

DOMAIN="ekzem.example.com"
EMAIL="your-email@example.com"

echo "=== Eczema Tracker Server Setup ==="

# Update system
apt-get update && apt-get upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose plugin (v2)
if ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose plugin..."
    apt-get install -y docker-compose-plugin
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt-get install -y nginx
    systemctl enable nginx
fi

# Install Certbot
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    apt-get install -y certbot python3-certbot-nginx
fi

# Create project directory
mkdir -p /opt/eczema-tracker
mkdir -p /backups
mkdir -p /data/photos

# Obtain SSL certificate
echo "Obtaining SSL certificate for ${DOMAIN}..."
certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}"

# Set up certbot auto-renewal
systemctl enable certbot.timer
systemctl start certbot.timer

# Set up backup cron
echo "Setting up backup cron job..."
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/eczema-tracker/scripts/backup.sh >> /var/log/eczema-backup.log 2>&1") | crontab -

echo "=== Server setup complete ==="
echo "Next steps:"
echo "1. Clone the repository to /opt/eczema-tracker"
echo "2. Copy .env.example to .env and fill in values"
echo "3. Copy nginx/nginx.conf to /etc/nginx/sites-enabled/"
echo "4. Run: docker compose up -d"
echo "5. Run: sudo nginx -t && sudo systemctl reload nginx"
```

#### Step 10: Complete the .env.example

Update `.env.example` with all required variables:

```bash
# Database
POSTGRES_PASSWORD=your-secure-database-password
DATABASE_URL=postgresql://eczema:your-secure-database-password@postgres:5432/eczema_tracker

# Application
ORIGIN=https://ekzem.example.com
NODE_ENV=production
PORT=3000

# Session
SESSION_SECRET=your-random-session-secret-at-least-32-characters

# VAPID keys (generate with: npx tsx scripts/generate-vapid-keys.ts)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:your-email@example.com

# Claude API
CLAUDE_API_KEY=your-claude-api-key

# Backup (used by scripts/backup.sh)
GPG_RECIPIENT=your-gpg-key-id
```

#### Step 11: Mobile UX Polish Checklist

Perform a systematic review on physical iPhone devices (or BrowserStack):

1. **Responsive layout**: Test on iPhone SE (375px), iPhone 12/13/14 (390px), iPhone 14/15 Pro Max (430px). Verify all pages fit without horizontal scroll, text is readable without zooming, and tap targets are at least 44x44px.

2. **Touch interactions**:
   - Swipe gestures (if any) work smoothly.
   - Long press on photos shows context actions (not the browser context menu).
   - Pull-to-refresh works in the PWA (if implemented).
   - Date pickers and time pickers render native iOS controls.

3. **Safe area insets**: On devices with a notch (iPhone X+), verify content does not overlap the status bar or home indicator. Use CSS `env(safe-area-inset-*)`.

4. **Loading states**: Every page and action that takes more than 200ms shows a loading indicator. Use skeleton screens for initial page loads, spinners for actions.

5. **Error states**: All error messages are in Czech. Network errors show "Doslo k chybe. Zkuste to prosim znovu." with a retry option. Form validation errors appear inline next to the relevant field.

6. **Empty states**: Pages with no data (food log, photos, analyses, trends) show a friendly message explaining what to do next. For example, the food log page shows "Zatim zadne zaznamy. Pridejte prvni zaznam jidla." with a prominent "Pridat zaznam" button.

7. **Accessibility**: All interactive elements have sufficient color contrast (WCAG AA, 4.5:1 for text). Font sizes are at least 16px for body text (prevents iOS zoom on input focus). Tap targets are spaced at least 8px apart.

#### Step 12: Offline-to-Online Sync Verification

Test the following scenarios manually:

1. **Create data offline**: Enter airplane mode. Add a food log entry, take a photo. Re-enable the network. Verify data appears on the server within 60 seconds.

2. **Conflict resolution**: Create a food log entry on two devices while one is offline. Bring both online. Verify both entries are preserved (last-write-wins or merge, depending on sync strategy).

3. **Large sync queue**: Create 20+ entries offline. Go online. Verify all entries sync without loss or duplication. Monitor for errors in the browser console.

4. **Intermittent connectivity**: Toggle airplane mode every 10 seconds while the app is syncing. Verify no data loss or corruption after the network stabilizes.

#### Step 13: Encryption Verification

1. **Server-side blob inspection**: SSH into the VPS. Navigate to `/data/photos/`. Attempt to open any file with an image viewer. Verify it is not a valid image (the file should be an AES-256-GCM encrypted blob, not a recognizable image format).

2. **Database inspection**: Connect to PostgreSQL. Query any table that stores encrypted data. Verify the contents are base64 or binary blobs, not plaintext.

3. **Log inspection**: Review application logs (`docker compose logs app`). Search for any base64-encoded image data, passwords, or encryption keys. None should appear.

4. **Network inspection**: Use browser DevTools to inspect all requests during photo upload and download. Verify that photo data sent to the server is encrypted (not a raw image), and that decryption only happens client-side.

### Key Code Patterns

**Multi-stage Docker build**: The Dockerfile uses a two-stage build. The first stage installs all dependencies (including devDependencies) and runs `bun run build` to produce the SvelteKit output. The second stage copies only the built output and production dependencies, resulting in a smaller image.

**Host-level Nginx**: Nginx runs on the host (not in Docker) to simplify SSL certificate management with certbot. It reverse-proxies to the app container on `127.0.0.1:3000`. The app container only binds to localhost, preventing direct access bypassing Nginx.

**Encrypted backups**: PostgreSQL dumps are piped directly through `gpg --encrypt`, so unencrypted dumps never touch disk. Photos on the server are already encrypted (AES-256-GCM), so they are backed up as-is via rsync.

**Centralized i18n**: All Czech strings live in `src/lib/i18n/cs.ts` as a single typed object. Components import and reference specific keys, making it easy to audit completeness and consistency.

**PWA install prompt**: The `beforeinstallprompt` event is captured and deferred. A custom Svelte component shows the install prompt with Czech text. On iOS, which does not fire this event, a separate instruction overlay is shown. The prompt is dismissed for the session after the user clicks "Pozdeji".

### Account Deletion

Add a "Smazat účet" (Delete account) button in Settings with a confirmation dialog:

> "Toto smaže veškerá data včetně fotek. Tuto akci nelze vrátit zpět." (This will delete all data including photos. This action cannot be undone.)

Implementation:

1. Delete all children (cascades to food_logs, tracking_photos, analysis_results)
2. Delete photo blob files from filesystem
3. Delete Google Doc connection (revoke token)
4. Delete push subscriptions
5. Delete the user record (cascades to sessions)
6. Clear all Dexie tables
7. Redirect to login page

### Data Export

Before account deletion, offer a JSON data export:

```typescript
GET /api/export/data → {
  user: User,
  children: Child[],
  foodLogs: FoodLog[],
  meals: Meal[],
  photos: TrackingPhoto[], // metadata only, not blobs
  analysisResults: AnalysisResult[]
}
```

Photos (encrypted blobs) are not included in the JSON export — they can be exported via the PDF feature.

## Post-Implementation State

The Eczema Tracker PWA is fully deployed on the VPS, accessible via HTTPS at the configured domain. Docker containers run the SvelteKit app (with Node adapter) and PostgreSQL 16. Nginx handles HTTPS termination with an auto-renewing Let's Encrypt certificate and adds security headers. Automated daily backups produce GPG-encrypted PostgreSQL dumps with a 7-daily + 4-weekly retention policy; photos are synced to the backup location. The PWA installs cleanly on both Android (custom install prompt) and iOS (manual installation instructions). All UI text is in Czech, verified across every page and state. The offline-to-online sync flow works reliably, and server-stored photo blobs are confirmed to be encrypted. The application is ready for daily use.

## Test Suite

### Unit Tests

1. **Czech translation completeness**
   - Every key in `cs.ts` is a non-empty string.
   - No English words appear in any translation value (spot-check common English words like "error", "save", "loading").
   - All translation keys used in Svelte components exist in `cs.ts` (static analysis or grep).

2. **Install store behavior**
   - `init()` sets `isInstalled: true` when `display-mode: standalone` matches.
   - `init()` captures `beforeinstallprompt` event and sets `canInstall: true`.
   - `dismiss()` sets `showPrompt: false` and persists dismissal in sessionStorage.
   - `promptInstall()` calls `prompt()` on the deferred event and updates state on acceptance.

3. **Dockerfile build validation**
   - The Dockerfile produces a valid image (verify by building locally with `docker build .`).
   - The production stage does not contain `node_modules` devDependencies (verify the image size is under a reasonable threshold, e.g., 200MB).
   - The `HEALTHCHECK` command targets an existing endpoint (`/api/health`).

4. **Nginx configuration syntax**
   - Running `nginx -t` with the provided config produces no errors.
   - All `proxy_pass` directives target the correct backend address.
   - Security headers are present in the response (testable with `curl -I`).

5. **Backup script logic**
   - Given 10 existing daily backups and `DAILY_RETENTION=7`, the cleanup step removes exactly 3 oldest files.
   - Given 6 existing weekly backups and `WEEKLY_RETENTION=4`, the cleanup step removes exactly 2 oldest files.
   - On Sunday (day_of_week=7), the script copies the daily backup to the weekly directory.
   - On non-Sunday days, no weekly backup is created.

6. **Restore script safety**
   - The script requires exactly one argument and exits with error if none is provided.
   - The script prompts for confirmation and aborts on "N".
   - After restore, the app container is restarted.

### Integration Tests

1. **Docker Compose startup**
   - Run `docker compose up -d` from a clean state.
   - Verify both containers (`eczema-tracker-app` and `eczema-tracker-db`) are running.
   - Verify the app container passes its health check within 30 seconds.
   - Verify the app responds to `curl http://127.0.0.1:3000/api/health` with a 200 status.

2. **Database connectivity**
   - After `docker compose up`, verify the app can connect to PostgreSQL (check app logs for successful connection message).
   - Run a simple API request that queries the database (e.g., `GET /api/health` if it checks the DB, or login with test credentials).

3. **Nginx proxy verification**
   - With Nginx and Docker running, verify `curl -I https://ekzem.example.com` returns 200 with the expected security headers.
   - Verify `curl http://ekzem.example.com` returns a 301 redirect to HTTPS.
   - Verify WebSocket connections work through Nginx (if the app uses them for hot reload or real-time features).

4. **Full backup and restore cycle**
   - Seed the database with test data (users, children, food logs, etc.).
   - Run `scripts/backup.sh` and verify a `.dump.gpg` file is created in `/backups/daily/`.
   - Delete all data from the database.
   - Run `scripts/restore.sh /backups/daily/<latest>.dump.gpg` and verify all data is restored.
   - Verify the app works correctly after restore (login, view data).

5. **SSL certificate validity**
   - Verify the SSL certificate is valid and not expired: `openssl s_client -connect ekzem.example.com:443 -servername ekzem.example.com`.
   - Verify the certificate auto-renewal timer is active: `systemctl status certbot.timer`.

### E2E / Manual Tests

1. **Full deployment from scratch**
   - Provision a fresh VPS (Ubuntu 22.04).
   - Run `scripts/setup-server.sh` with correct domain and email.
   - Clone the repo to `/opt/eczema-tracker`, configure `.env`.
   - Run `docker compose up -d`.
   - Configure Nginx and reload.
   - Access the app at `https://ekzem.example.com` and verify the login page loads.

2. **PWA install flow (Android)**
   - Open the app in Chrome on an Android device.
   - Verify the custom install prompt appears in Czech.
   - Tap "Nainstalovat" and verify the browser's native install dialog appears.
   - Complete installation and verify the app opens in standalone mode.
   - Verify the install prompt does not appear again.

3. **PWA install flow (iOS)**
   - Open the app in Safari on an iPhone.
   - Verify the iOS-specific instruction overlay appears.
   - Follow the instructions: tap Share, then "Pridat na plochu".
   - Verify the app opens in standalone mode from the home screen.
   - Verify push notifications work in standalone mode (if Phase 6 is complete).

4. **Mobile UX spot check**
   - On iPhone SE: navigate through all main pages (home, food log, photos, analysis, trends, export, settings). Verify no layout issues, all text is readable, all buttons are tappable.
   - On iPhone 15 Pro Max: repeat the same navigation. Verify the larger screen is utilized well (no excessive whitespace).
   - In both cases, verify the status bar area and home indicator do not overlap content.

5. **Offline-to-online sync end-to-end**
   - Log in on an iPhone. Enable airplane mode.
   - Add 3 food log entries and take 1 photo.
   - Disable airplane mode.
   - Wait up to 60 seconds. Check the server database (or another logged-in device) and verify all 4 items appeared.

6. **Encryption verification on production server**
   - SSH into the VPS.
   - List files in `/data/photos/`. Pick a file and attempt `file <filename>` -- verify it reports "data" rather than an image format.
   - Connect to PostgreSQL and query a table with encrypted data. Verify values are not human-readable.
   - Run `docker compose logs app | grep -i "password\|secret\|key\|base64"` and verify no sensitive data appears in logs.

7. **Full regression walkthrough**
   - Register a new account.
   - Add a child.
   - Log food entries for 3 days (including eliminations and reintroductions).
   - Take 5 photos across different body areas with severity ratings.
   - Run an AI analysis on a photo.
   - View trends and verify charts display correctly.
   - Configure push notification reminders and verify they fire.
   - Generate a PDF export and verify all sections.
   - Download the PDF and open it to confirm it is valid.
   - Log out and log back in; verify all data persists.

### Regression Checks

1. Verify that the Docker build does not break any existing functionality by running the application end-to-end in the containerized environment.
2. Verify that adding the `InstallPrompt` component to the root layout does not cause layout shifts or z-index conflicts with existing modals or overlays.
3. Verify that the Nginx `Content-Security-Policy` header does not block any legitimate resources (scripts, styles, images, API calls, service worker). Adjust the policy if the app uses inline styles or external fonts.
4. Verify that the centralized `cs.ts` file does not introduce import errors in any component (check for missing keys, typos in key paths).
5. Verify that the backup cron job does not cause noticeable performance degradation during the backup window (02:00). The `pg_dump` should complete within a few seconds for this application's data volume.
6. Verify that the restore script works on a fresh database (no existing tables) and on a database with existing data (drop + recreate).
7. Verify that all environment variables in `.env.example` are documented and that missing any required variable causes a clear startup error (not a cryptic runtime crash).
8. Verify that the service worker cache strategy does not serve stale content after a deployment. The service worker file (`sw.js`) must not be cached by Nginx (confirmed by the cache-busting location block).
9. Verify that the app starts correctly after a server reboot (Docker containers restart via `restart: unless-stopped`, Nginx via systemd).
