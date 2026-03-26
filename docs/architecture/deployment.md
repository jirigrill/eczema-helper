# Deployment Architecture

This document describes deployment for the Eczema Tracker PWA across two stages: local development (Docker on a laptop, accessible to real phones on the local network) and production (self-hosted VPS). It covers the local dev setup with mkcert, production server architecture, Docker Compose configuration, Nginx reverse proxy, TLS certificates, backup strategy, and monitoring.

---

## Stage 1: Local Development Setup

The app first runs on the developer's laptop in Docker, accessible via HTTPS on the local network. Real phones (iPhone, Android) connect over WiFi to test PWA features.

### Why HTTPS Locally

Several PWA features require a secure context (HTTPS or localhost):

- **Web Crypto API** (AES-256-GCM encryption) -- requires secure context
- **Service workers** -- only register on HTTPS (or localhost)
- **Web Push API** -- requires secure context
- **PWA install prompt** -- requires HTTPS
- **Camera access (getUserMedia)** -- requires secure context

`localhost` counts as secure, but phones on the local network need real HTTPS. This is solved with `mkcert`.

### Architecture

```
Developer Laptop (macOS)
│
├── Docker Desktop
│   ├── Container: app (Node.js / SvelteKit)
│   │   ├── Serves SSR pages and static PWA assets
│   │   ├── API routes (/api/*)
│   │   ├── Listens on 0.0.0.0:3000 (accessible from LAN)
│   │   └── Mounts ./data/photos/ for encrypted blob storage
│   │
│   └── Container: postgres (PostgreSQL 16)
│       ├── Data stored on named Docker volume
│       └── Accessible from app container via Docker network
│
├── Caddy (lightweight reverse proxy for HTTPS)
│   ├── Listens on 0.0.0.0:443
│   ├── TLS certificate from mkcert (trusted locally)
│   └── Proxies to localhost:3000
│
└── mkcert root CA
    ├── Installed in macOS keychain (laptop trusts it)
    └── Installed on test phones (iPhone/Android trust it)
```

### Step-by-Step Setup

#### 1. Install mkcert

```bash
brew install mkcert

# Install the local CA into the macOS trust store
mkcert -install
```

#### 2. Generate certificates for local network

Find your laptop's local IP (e.g., `192.168.1.42`):

```bash
# macOS
ipconfig getifaddr en0
```

Generate a certificate that covers both localhost and your LAN IP:

```bash
cd eczema_helper
mkdir -p certs
mkcert -cert-file certs/local.pem -key-file certs/local-key.pem \
  localhost 127.0.0.1 192.168.1.42
```

#### 3. Trust the CA on test phones

The mkcert root CA needs to be installed on each phone so it trusts the local HTTPS certificate.

**iPhone:**

1. Find the CA file: `mkcert -CAROOT` (shows the directory, e.g., `~/Library/Application Support/mkcert`)
2. AirDrop `rootCA.pem` to the iPhone, or email it, or serve it from a quick HTTP server
3. On the iPhone: Settings > General > VPN & Device Management > install the profile
4. Settings > General > About > Certificate Trust Settings > enable full trust for the mkcert root CA

**Android:**

1. Transfer `rootCA.pem` to the device
2. Settings > Security > Encryption & credentials > Install a certificate > CA certificate

#### 4. Set up Caddy as local HTTPS reverse proxy

Caddy is simpler than Nginx for local dev. Install and configure:

```bash
brew install caddy
```

Create `Caddyfile` in the project root:

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

Start Caddy:

```bash
caddy run --config Caddyfile
```

#### 5. Docker Compose for local development

```yaml
# docker-compose.dev.yml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: eczema-app-dev
    restart: unless-stopped
    ports:
      - "0.0.0.0:3000:3000" # Accessible from LAN
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://eczema:eczema_dev@postgres:5432/eczema_helper
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
      - POSTGRES_DB=eczema_helper
      - POSTGRES_USER=eczema
      - POSTGRES_PASSWORD=eczema_dev
    ports:
      - "127.0.0.1:5432:5432" # Only accessible from laptop (for DB tools)
    volumes:
      - pgdata-dev:/var/lib/postgresql/data
    networks:
      - internal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U eczema -d eczema_helper"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata-dev:

networks:
  internal:
    driver: bridge
```

#### 6. Start everything

```bash
# Start Docker containers
docker compose -f docker-compose.dev.yml up -d

# Start Caddy (in another terminal or background)
caddy run --config Caddyfile &

# Or during active development, use SvelteKit dev server instead of Docker app:
bun run dev -- --host 0.0.0.0
# Then Caddy proxies to localhost:5173 instead of :3000
```

#### 7. Access from phones

On any phone connected to the same WiFi:

- Open `https://192.168.1.42` in Safari (iPhone) or Chrome (Android)
- The mkcert certificate is trusted, so no security warnings
- PWA install works: Safari > Share > Add to Home Screen

### Testing from Real Devices

**Why real devices over emulators:**

| Feature                    | iPhone Simulator | Android Emulator | Real Phone on WiFi |
| -------------------------- | ---------------- | ---------------- | ------------------ |
| PWA install to home screen | Not supported    | Partial          | Full support       |
| Camera capture             | No               | Fake camera      | Real photos        |
| Web Push notifications     | Not supported    | Partial          | Full (iOS 16.4+)   |
| Touch gestures (swipe)     | Mouse only       | Mouse only       | Native             |
| Offline/online toggle      | Works            | Works            | Real-world         |
| Performance feel           | Misleading       | Misleading       | Accurate           |

**Remote debugging:**

- **iPhone**: Connect via USB. Open Safari on Mac > Develop menu > [device name] > select the page. Full console + DOM inspector.
- **Android**: Connect via USB. Open `chrome://inspect` in Chrome on laptop. Full DevTools for the phone's Chrome tab.

Both give you console access, network inspection, and DOM debugging on the real device.

### Dev vs Production Differences

| Aspect             | Local Dev                      | Production (VPS)             |
| ------------------ | ------------------------------ | ---------------------------- |
| HTTPS              | mkcert + Caddy                 | Let's Encrypt + Nginx        |
| App access         | LAN only (192.168.x.x)         | Public domain                |
| PostgreSQL         | Exposed on localhost:5432      | Internal Docker network only |
| Photo storage      | ./data/photos/ (local dir)     | /data/photos/ (server dir)   |
| Backups            | Not needed                     | Automated daily              |
| Push notifications | Can test (VAPID keys optional) | Full VAPID setup             |

---

## Stage 1b: Home LAN Server (Linux)

This stage covers running the app on a dedicated Linux machine on the home network — the primary way to use the app with a real phone without relying on the dev laptop staying on. The architecture is identical to the laptop setup (Docker + Caddy + mkcert), but the steps use Linux tooling instead of Homebrew.

### Prerequisites

```bash
# Docker Engine
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER   # allow running docker without sudo (re-login to take effect)

# Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
sudo systemctl stop caddy   # disable default Caddy service — we'll run it manually with our Caddyfile

# mkcert
sudo apt install mkcert   # Ubuntu 22.04+; if unavailable:
# curl -L https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-v1.4.4-linux-amd64 \
#   -o mkcert && chmod +x mkcert && sudo mv mkcert /usr/local/bin/
```

### Deploy the App

```bash
# Clone the repository
git clone git@github.com:you/eczema-tracker.git /opt/eczema-tracker
cd /opt/eczema-tracker

# Create .env from example and fill in secrets
cp .env.example .env
# Edit DATABASE_URL and SESSION_SECRET (at minimum, generate a strong SESSION_SECRET)

# Generate mkcert certs for the server's LAN IP
SERVER_IP=$(hostname -I | awk '{print $1}')
mkcert -install
mkdir -p certs
mkcert -cert-file certs/local.pem -key-file certs/local-key.pem localhost 127.0.0.1 $SERVER_IP

# Update Caddyfile to use the server's actual LAN IP
sed -i "s/192.168.1.42/$SERVER_IP/g" Caddyfile

# Start PostgreSQL and the app
docker compose -f docker-compose.dev.yml up -d
```

### Run Caddy as a Systemd Service

The default Caddy systemd unit uses its own config. Override it to use the project Caddyfile:

```bash
# Create a systemd override
sudo mkdir -p /etc/systemd/system/caddy.service.d
sudo tee /etc/systemd/system/caddy.service.d/override.conf > /dev/null <<EOF
[Service]
ExecStart=
ExecStart=/usr/bin/caddy run --environ --config /opt/eczema-tracker/Caddyfile
ExecReload=
ExecReload=/usr/bin/caddy reload --config /opt/eczema-tracker/Caddyfile --force
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now caddy
```

Caddy now starts automatically on boot and serves HTTPS on the server's LAN IP.

### Trust the CA on Devices

The mkcert root CA on the Linux server is at `$(mkcert -CAROOT)/rootCA.pem`. Copy it to each device:

```bash
# Serve the CA file temporarily for easy download on phones
python3 -m http.server 8080 --directory $(mkcert -CAROOT)
# Then open http://<server-ip>:8080/rootCA.pem on the phone
```

Install on **iPhone**: Settings > General > VPN & Device Management > install the profile, then Settings > General > About > Certificate Trust Settings > enable full trust.

Install on **Android**: Settings > Security > Encryption & credentials > Install a certificate > CA certificate.

### Access the App

On any device on the same WiFi, navigate to `https://<server-ip>`. The certificate is trusted (no warnings). Use Safari on iPhone to add to Home Screen for PWA installation.

### Updating

```bash
cd /opt/eczema-tracker
git pull
docker compose -f docker-compose.dev.yml up -d --build
```

This rebuilds the app image and restarts only the app container. PostgreSQL and its data are unaffected.

---

## Stage 2: Production VPS

### VPS Architecture Overview

```
VPS (Ubuntu 24.04 LTS / Debian 12)
│
├── Nginx (host-level, reverse proxy + HTTPS termination)
│   ├── Let's Encrypt certificate (auto-renewed via certbot timer)
│   ├── Listens on :443 (HTTPS) and :80 (redirect to HTTPS)
│   └── Proxies to Docker app container on localhost:3000
│
├── Docker Engine
│   ├── docker-compose.yml
│   │
│   ├── Container: app (Node.js / SvelteKit)
│   │   ├── Serves SSR pages and static PWA assets
│   │   ├── API routes (/api/*)
│   │   ├── Connects to PostgreSQL via internal Docker network
│   │   ├── Cron: push notification scheduler (runs every minute)
│   │   ├── Mounts /data/photos/ for encrypted blob storage
│   │   └── Reads environment variables from .env file
│   │
│   └── Container: postgres (PostgreSQL 16)
│       ├── Data stored on named Docker volume (persistent)
│       ├── Listens on internal Docker network only (not exposed to host)
│       └── Initialized with schema migrations on first start
│
├── /data/photos/                (encrypted photo blobs)
│   └── {childId}/{date}/       (organized by child and date)
│       ├── {photoId}.enc       (encrypted full image)
│       └── {photoId}_thumb.enc (encrypted thumbnail)
│
├── /backups/                    (automated daily backups)
│   ├── db/                     (encrypted PostgreSQL dumps)
│   │   └── eczema_YYYY-MM-DD.sql.gz.enc
│   └── photos/                 (rsync mirror of /data/photos/)
│
└── /var/log/                    (logs)
    ├── nginx/access.log
    ├── nginx/error.log
    └── docker containers (via docker logs)
```

---

## Docker Compose Configuration

### docker-compose.yml

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: eczema-app
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
    ports:
      - "127.0.0.1:3000:3000" # Only listen on localhost (Nginx proxies)
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://eczema:${DB_PASSWORD}@postgres:5432/eczema
      - SESSION_SECRET=${SESSION_SECRET}
      - VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
      - VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
      - VAPID_SUBJECT=mailto:${ADMIN_EMAIL}
    volumes:
      - photo-data:/data/photos
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - internal
    healthcheck:
      test:
        ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

  postgres:
    image: postgres:16-alpine
    container_name: eczema-postgres
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M
    environment:
      - POSTGRES_DB=eczema
      - POSTGRES_USER=eczema
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - pg-data:/var/lib/postgresql/data
    networks:
      - internal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U eczema -d eczema"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

volumes:
  pg-data:
    driver: local
  photo-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/photos

networks:
  internal:
    driver: bridge
```

### Key Design Decisions

- **App binds to `127.0.0.1:3000` only.** The app is not directly accessible from the internet. Nginx handles all external traffic.
- **PostgreSQL is on an internal network only.** No port mapping to the host. Only the app container can reach it.
- **Photo storage uses a bind mount.** The `/data/photos/` directory on the host is mounted into the app container. This makes backups straightforward (just rsync the host directory).
- **Health checks** ensure Docker restarts unhealthy containers and the app waits for PostgreSQL to be ready before starting.
- **Secrets via .env file.** The `.env` file (not committed to git) contains `DB_PASSWORD`, `SESSION_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `ADMIN_EMAIL`.

### Dockerfile

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Stage 2: Production
FROM oven/bun:1-slim AS runner

WORKDIR /app

# Copy built output and production dependencies
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN mkdir -p /data/photos && chown -R appuser:appgroup /data/photos
USER appuser

EXPOSE 3000
CMD ["node", "build"]
```

### Graceful Shutdown

Set `stop_grace_period: 30s` on the app service in Docker Compose. SvelteKit's adapter-node handles SIGTERM by default — it stops accepting new connections and waits for in-flight requests to complete. Ensure the PostgreSQL connection pool is drained on shutdown:

```typescript
// In the server startup or hooks
process.on("SIGTERM", async () => {
  await sql.end({ timeout: 10 }); // drain postgres.js pool
  process.exit(0);
});
```

---

## Nginx Reverse Proxy

Nginx runs on the host (not in Docker) to handle HTTPS termination and reverse proxying.

### Installation

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

### Nginx Configuration

File: `/etc/nginx/sites-available/eczema-tracker`

```nginx
# Rate limiting zones (defined outside server blocks)
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name eczema.example.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name eczema.example.com;

    # TLS certificates (managed by certbot)
    ssl_certificate /etc/letsencrypt/live/eczema.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/eczema.example.com/privkey.pem;

    # TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # HSTS (1 year)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(self), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;

    # Max upload size for photos (encrypted blobs up to ~5 MB)
    client_max_body_size 10M;

    # Rate limit auth endpoints (5 requests/minute per IP — brute-force protection)
    location /api/auth/ {
        limit_req zone=auth burst=3 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Rate limit API endpoints (30 requests/minute per IP)
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Reverse proxy to SvelteKit app (pages)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache static assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|webmanifest)$ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Service worker should not be cached
    location = /sw.js {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        expires 0;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

**CSRF Protection:** SvelteKit's `+server.ts` endpoints automatically check the `Origin` header on non-GET requests when running in production mode. This prevents cross-site POST/PUT/DELETE attacks without additional CSRF tokens. The `SameSite=Lax` cookie attribute provides a second layer of protection.

**CSP Note:** This is the canonical CSP configuration. Phase 8 should use the same CSP. Avoid `'unsafe-inline'` for `script-src` — SvelteKit can be configured to use nonces instead. The `connect-src 'self'` is correct because the AI analysis uses a server proxy (client never calls api.anthropic.com directly). If `'unsafe-inline'` for `script-src` cannot be avoided due to SvelteKit's inline scripts, document this as a known trade-off.

### Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/eczema-tracker /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## Let's Encrypt / Certbot

### Initial Certificate

```bash
sudo certbot --nginx -d eczema.example.com --email admin@example.com --agree-tos
```

### Auto-Renewal

Certbot installs a systemd timer that runs twice daily. Verify it is active:

```bash
sudo systemctl status certbot.timer
```

The timer runs `certbot renew`, which checks all certificates and renews any that expire within 30 days. After renewal, Nginx is reloaded automatically via the `--deploy-hook` that certbot configures.

To test renewal manually:

```bash
sudo certbot renew --dry-run
```

---

## Backup Strategy

### Overview

| What                  | How                                   | Frequency      | Retention               |
| --------------------- | ------------------------------------- | -------------- | ----------------------- |
| PostgreSQL database   | `pg_dump` compressed and encrypted    | Daily at 03:00 | 30 days                 |
| Encrypted photo blobs | `rsync` to backup directory           | Daily at 03:30 | Mirror (always current) |
| Backup to off-site    | `rsync` or `rclone` to remote storage | Weekly         | 12 weeks                |

### PostgreSQL Backup Script

File: `/opt/eczema-backup/backup-db.sh`

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/backups/db"
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="${BACKUP_DIR}/eczema_${DATE}.sql.gz.enc"
ENCRYPTION_KEY_FILE="/opt/eczema-backup/backup.key"

# Create backup directory if it does not exist
mkdir -p "${BACKUP_DIR}"

# Dump, compress, and encrypt
docker exec eczema-postgres pg_dump -U eczema -d eczema \
  | gzip \
  | openssl enc -aes-256-cbc -salt -pbkdf2 -pass file:"${ENCRYPTION_KEY_FILE}" \
  > "${BACKUP_FILE}"

# Remove backups older than 30 days
find "${BACKUP_DIR}" -name "eczema_*.sql.gz.enc" -mtime +30 -delete

echo "Database backup completed: ${BACKUP_FILE}"
```

### Photo Backup Script

File: `/opt/eczema-backup/backup-photos.sh`

```bash
#!/bin/bash
set -euo pipefail

# Photos are already encrypted (E2E), so just mirror the directory
rsync -a --delete /data/photos/ /backups/photos/

echo "Photo backup completed"
```

### Cron Schedule

```cron
# /etc/cron.d/eczema-backup
0 3 * * * root /opt/eczema-backup/backup-db.sh >> /var/log/eczema-backup.log 2>&1
30 3 * * * root /opt/eczema-backup/backup-photos.sh >> /var/log/eczema-backup.log 2>&1
```

### Off-site Backup (Required)

For disaster recovery, sync backups to a remote location weekly. Since encrypted photos are irreplaceable (lost passphrase = unrecoverable by design, lost data = unrecoverable by physics), single-point-of-failure for backups is unacceptable.

```bash
# Weekly sync to remote storage (e.g., Hetzner Storage Box ~3 EUR/month, Backblaze B2 free tier)
rclone sync /backups/ remote:eczema-backups/ --transfers 4
```

**Backup verification:** After the weekly off-site sync, restore the latest DB dump to a temporary database and verify data integrity:

```bash
# Verify backup can be decrypted and restored
openssl enc -aes-256-cbc -d -pbkdf2 -pass file:/opt/eczema-backup/backup.key \
  < /backups/db/eczema_latest.sql.gz.enc | gunzip | head -5
```

Schedule weekly:

```cron
0 4 * * 0 root /opt/eczema-backup/offsite-sync.sh >> /var/log/eczema-backup.log 2>&1
```

### Restore Procedures

**Restore PostgreSQL:**

```bash
# Decrypt and decompress
openssl enc -aes-256-cbc -d -pbkdf2 -pass file:/opt/eczema-backup/backup.key \
  < /backups/db/eczema_2025-04-01.sql.gz.enc \
  | gunzip \
  | docker exec -i eczema-postgres psql -U eczema -d eczema
```

**Restore photos:**

```bash
rsync -a /backups/photos/ /data/photos/
```

---

## Monitoring

### Health Check Endpoint

The app exposes `GET /api/health` which returns:

```json
{
  "status": "ok",
  "database": "connected",
  "photoStorage": "accessible",
  "timestamp": "2025-04-01T12:00:00Z"
}
```

This endpoint is used by Docker's health check and can be polled by external monitoring.

### Log Management

**Docker container logs:**

```bash
# View app logs
docker logs eczema-app --tail 100 -f

# View PostgreSQL logs
docker logs eczema-postgres --tail 100 -f
```

**Log rotation for Docker:**

Configure Docker daemon to limit log file sizes. File: `/etc/docker/daemon.json`

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

**Nginx log rotation:**

Nginx log rotation is handled by the default logrotate configuration installed with the Nginx package (`/etc/logrotate.d/nginx`). Verify it rotates weekly and keeps 4 weeks:

```
/var/log/nginx/*.log {
    weekly
    missingok
    rotate 4
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 $(cat /var/run/nginx.pid)
    endscript
}
```

### Disk Space Monitoring

Disk usage is the primary concern for a photo storage app. A simple monitoring script:

File: `/opt/eczema-backup/check-disk.sh`

```bash
#!/bin/bash
THRESHOLD=85
USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')

if [ "$USAGE" -gt "$THRESHOLD" ]; then
  echo "WARNING: Disk usage is ${USAGE}% (threshold: ${THRESHOLD}%)"
  # Optionally send a push notification via the app's own push infrastructure
  # or send an email alert
fi
```

Schedule daily:

```cron
0 8 * * * root /opt/eczema-backup/check-disk.sh >> /var/log/eczema-monitor.log 2>&1
```

### Estimated Disk Usage

| Data type            | Size per item  | Items per month (estimate) | Monthly growth    |
| -------------------- | -------------- | -------------------------- | ----------------- |
| Encrypted full photo | ~500 KB - 2 MB | ~30 photos                 | ~30 - 60 MB       |
| Encrypted thumbnail  | ~20 - 50 KB    | ~30 thumbnails             | ~1 - 2 MB         |
| PostgreSQL data      | negligible     | -                          | < 1 MB            |
| Total                |                |                            | ~35 - 65 MB/month |

At this rate, a 20 GB disk allocation for photos would last over 25 years. Disk space is not a practical concern for this app.

---

## Deployment Checklist

### Initial Server Setup

1. Provision a VPS (Ubuntu 24.04 LTS, minimum 1 GB RAM, 20 GB disk).
2. Create a non-root user with sudo access.
3. Configure SSH key authentication, disable password login.
4. Set up UFW firewall: allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS).
5. Install Docker Engine and Docker Compose plugin.
6. Install Nginx and Certbot.
7. Point your domain's DNS A record to the VPS IP address.

### Application Deployment

1. Clone the repository to the server (e.g., `/opt/eczema-tracker/`).
2. Create the `.env` file from `.env.example` and fill in all secrets.
3. Create the photo storage directory: `sudo mkdir -p /data/photos && sudo chown 1000:1000 /data/photos`.
4. Run `docker compose up -d` to start PostgreSQL and the app.
5. Run database migrations: `docker exec eczema-app node build/migrate.js` (or however migrations are triggered).
6. Run database seed: `docker exec eczema-app node build/seed.js` (food categories).
7. Configure Nginx with the site config and obtain the TLS certificate.
8. Set up backup scripts and cron jobs.
9. Verify the health check: `curl https://eczema.example.com/api/health`.
10. Install the PWA on the iPhone: open the URL in Safari, tap Share, tap "Add to Home Screen."

### Updating the Application

```bash
cd /opt/eczema-tracker
git pull origin main
docker compose build app
# Run migrations BEFORE restarting the app (new schema, old code is safe)
docker exec eczema-app node build/migrate.js
# Now restart with new code
docker compose up -d app
# Verify health
curl -s https://eczema.example.com/api/health | jq .
```

The PostgreSQL container does not need to be restarted for app updates. The zero-downtime goal is not critical for a personal app (a few seconds of downtime during restart is acceptable).

### Generating VAPID Keys

VAPID keys are needed for Web Push notifications. Generate them once:

```bash
npx web-push generate-vapid-keys
```

Store the public and private keys in the `.env` file.
