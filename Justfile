# Justfile - Eczema Tracker PWA task runner
# https://github.com/casey/just

# Show available commands (default)
default:
    @just --list

# bun PATH for recipes that need it
export PATH := "$HOME/.bun/bin:" + env_var_or_default("PATH", "")

# ========== SETUP ==========

# Install all required tools (auto-detects OS)
setup:
    #!/usr/bin/env bash
    OS=$(uname -s)
    case "$OS" in
        Darwin) just setup-macos ;;
        Linux) just setup-linux ;;
        *) echo "Unsupported: $OS"; exit 1 ;;
    esac
    bun install
    bunx svelte-kit sync
    echo "✅ Setup complete! Run 'just setup-certs' then 'just dev'."

# macOS setup via Homebrew
setup-macos:
    #!/usr/bin/env bash
    command -v brew &> /dev/null || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Node.js 20+ check
    if ! node -e "process.exit(process.version.slice(1).localeCompare('20.15.0', undefined, {numeric: true}) >= 0 ? 0 : 1)" 2>/dev/null; then
        brew install node@20
        echo 'export PATH="/usr/local/opt/node@20/bin:$PATH"' >> ~/.zshrc
        echo "⚠️  Run: source ~/.zshrc"
    fi
    
    brew install just mkcert caddy
    command -v docker &> /dev/null || echo "⚠️  Install Docker Desktop manually"
    command -v bun &> /dev/null || (curl -fsSL https://bun.sh/install | bash && echo "⚠️  Restart terminal")
    mkcert -install
    echo "✅ macOS ready"

# Linux setup (auto-detects distro)
setup-linux:
    #!/usr/bin/env bash
    if [[ -f /etc/debian_version ]]; then
        just setup-linux-debian
    elif [[ -f /etc/redhat-release ]] || [[ -f /etc/fedora-release ]]; then
        just setup-linux-redhat
    else
        echo "⚠️  Install manually: Bun, Docker, mkcert, Caddy"
        exit 1
    fi

# Debian/Ubuntu setup
setup-linux-debian:
    #!/usr/bin/env bash
    sudo apt-get update
    sudo apt-get install -y curl wget unzip gnupg2 ca-certificates lsb-release
    
    # Node.js 20+
    if ! node -e "process.exit(process.version.slice(1).localeCompare('20.15.0', undefined, {numeric: true}) >= 0 ? 0 : 1)" 2>/dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Docker
    command -v docker &> /dev/null || (sudo apt-get install -y docker.io docker-compose-plugin && sudo usermod -aG docker $USER)
    
    # mkcert
    command -v mkcert &> /dev/null || (sudo curl -L "$(curl -s https://api.github.com/repos/FiloSottile/mkcert/releases/latest | grep 'browser_download_url.*linux-amd64' | cut -d'\"' -f4)" -o /usr/local/bin/mkcert && sudo chmod +x /usr/local/bin/mkcert)
    
    # Caddy
    command -v caddy &> /dev/null || (sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https && curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg && curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list && sudo apt-get update && sudo apt-get install -y caddy)
    
    # Just & Bun
    command -v just &> /dev/null || (curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /tmp && sudo mv /tmp/just /usr/local/bin/)
    command -v bun &> /dev/null || (curl -fsSL https://bun.sh/install | bash && echo "⚠️  Restart terminal")
    
    mkcert -install
    echo "✅ Debian/Ubuntu ready"

# RedHat/Fedora setup
setup-linux-redhat:
    #!/usr/bin/env bash
    sudo dnf install -y curl wget unzip
    
    # Node.js 20+
    if ! node -e "process.exit(process.version.slice(1).localeCompare('20.15.0', undefined, {numeric: true}) >= 0 ? 0 : 1)" 2>/dev/null; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo dnf install -y nodejs
    fi
    
    # Docker
    command -v docker &> /dev/null || (sudo dnf install -y docker docker-compose && sudo systemctl enable --now docker && sudo usermod -aG docker $USER)
    
    # mkcert, Caddy, Just, Bun
    command -v mkcert &> /dev/null || (sudo curl -L "$(curl -s https://api.github.com/repos/FiloSottile/mkcert/releases/latest | grep 'browser_download_url.*linux-amd64' | cut -d'\"' -f4)" -o /usr/local/bin/mkcert && sudo chmod +x /usr/local/bin/mkcert)
    command -v caddy &> /dev/null || (sudo dnf install -y 'dnf-command(copr)' && sudo dnf copr enable -y @caddy/caddy && sudo dnf install -y caddy)
    command -v just &> /dev/null || (curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /tmp && sudo mv /tmp/just /usr/local/bin/)
    command -v bun &> /dev/null || (curl -fsSL https://bun.sh/install | bash && echo "⚠️  Restart terminal")
    
    mkcert -install
    echo "✅ RedHat/Fedora ready"

# Generate HTTPS certificates for local IP
setup-certs:
    #!/usr/bin/env bash
    if [[ "$(uname)" == "Darwin" ]]; then
        LOCAL_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo "127.0.0.1")
    else
        LOCAL_IP=$(hostname -I | awk '{print $1}')
    fi
    mkdir -p certs
    mkcert -cert-file certs/local.pem -key-file certs/local-key.pem localhost 127.0.0.1 "$LOCAL_IP"
    echo "✅ Certificates generated for IP: $LOCAL_IP"
    echo "📱 CA root for phone: $(mkcert -CAROOT)/rootCA.pem"

# Verify tools installed
check-tools:
    #!/usr/bin/env bash
    for tool in node bun docker mkcert caddy just; do
        if command -v "$tool" &> /dev/null; then
            echo "✅ $tool"
        else
            echo "❌ $tool"
        fi
    done

# ========== DEVELOPMENT ==========

# Start dev environment (PostgreSQL + Caddy + Vite)
dev:
    #!/usr/bin/env bash
    set -e
    command -v bun &> /dev/null || { echo "❌ Bun not found. Run: just setup"; exit 1; }
    [[ -d node_modules ]] || { echo "❌ node_modules missing. Run: just setup"; exit 1; }
    [[ -f certs/local.pem ]] || { echo "❌ Certs missing. Run: just setup-certs"; exit 1; }
    bunx svelte-kit sync

    # Get local IP (macOS and Linux)
    if [[ "$(uname)" == "Darwin" ]]; then
        LOCAL_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo "127.0.0.1")
    else
        LOCAL_IP=$(hostname -I | awk '{print $1}')
    fi

    # Clean up any leftover processes
    pkill -f "caddy run" 2>/dev/null || true
    docker compose -f docker-compose.postgres.yml down --remove-orphans 2>/dev/null || true
    sleep 1

    # Start PostgreSQL
    docker compose -f docker-compose.postgres.yml up -d
    echo "✅ PostgreSQL ready"

    # Start Caddy
    caddy run --config Caddyfile.dev &
    CADDY_PID=$!
    sleep 1
    kill -0 $CADDY_PID 2>/dev/null || { echo "❌ Caddy failed to start. Check Caddyfile.dev and certs/"; exit 1; }
    echo "✅ Caddy ready"

    # Start Vite dev server
    set +e
    bun run dev -- --host 0.0.0.0 &
    VITE_PID=$!
    sleep 2
    kill -0 $VITE_PID 2>/dev/null || { echo "❌ Vite failed to start"; pkill -f "caddy run" 2>/dev/null; exit 1; }
    echo "✅ Vite ready"

    echo ""
    echo "🌐 Access URLs:"
    echo "   Local:  http://localhost:5173"
    echo "   HTTPS:  https://$LOCAL_IP:8443  ← use this on phone"
    echo ""
    echo "Press Ctrl+C to stop all services"
    echo ""

    # Wait and clean up on exit
    trap 'pkill -f "caddy run" 2>/dev/null; docker compose -f docker-compose.postgres.yml down 2>/dev/null; exit' INT TERM
    wait $VITE_PID

# Start PostgreSQL only
dev-db:
    docker compose -f docker-compose.postgres.yml up -d
    @echo "✅ PostgreSQL on localhost:5432"

# Start pgAdmin with pre-configured connection to dev database
pgadmin:
    #!/usr/bin/env bash
    set -e

    # Load .env if exists
    if [[ -f .env ]]; then
        set -a && source .env && set +a
    fi

    # Use defaults if not set
    POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
    POSTGRES_PORT="${POSTGRES_PORT:-5432}"
    POSTGRES_DB="${POSTGRES_DB:-eczema_helper}"
    POSTGRES_USER="${POSTGRES_USER:-eczema}"
    POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-eczema_dev}"
    PGADMIN_EMAIL="${PGADMIN_EMAIL:-admin@local.dev}"
    PGADMIN_PASSWORD="${PGADMIN_PASSWORD:-admin}"

    # Stop existing pgadmin container if running
    docker stop pgadmin 2>/dev/null || true
    docker rm pgadmin 2>/dev/null || true

    # Create temp directory for pgAdmin config
    PGADMIN_CONFIG_DIR=$(mktemp -d)
    trap "rm -rf $PGADMIN_CONFIG_DIR" EXIT

    # Create servers.json for auto-configuration
    cat > "$PGADMIN_CONFIG_DIR/servers.json" << EOF
    {
      "Servers": {
        "1": {
          "Name": "Eczema Dev",
          "Group": "Servers",
          "Host": "eczema-postgres-dev",
          "Port": 5432,
          "MaintenanceDB": "postgres",
          "Username": "$POSTGRES_USER",
          "SSLMode": "prefer",
          "PassFile": "/pgadmin4/pgpass"
        }
      }
    }
    EOF

    # Create pgpass file for auto-login
    cat > "$PGADMIN_CONFIG_DIR/pgpass" << EOF
    eczema-postgres-dev:5432:*:$POSTGRES_USER:$POSTGRES_PASSWORD
    EOF
    chmod 600 "$PGADMIN_CONFIG_DIR/pgpass"

    # Determine network name (docker compose prefixes with directory name)
    # Note: curly braces escaped for just syntax
    NETWORK_NAME=$(docker network ls --format '{{"{{"}}.Name{{"}}"}}' | grep -E 'atopic_helper.*default|atopic_helper.*internal' | head -1)
    if [[ -z "$NETWORK_NAME" ]]; then
        echo "❌ No Docker network found. Start PostgreSQL first: just dev-db"
        exit 1
    fi

    # Start pgAdmin container
    docker run -d --name pgadmin \
        --network "$NETWORK_NAME" \
        -e PGADMIN_DEFAULT_EMAIL="$PGADMIN_EMAIL" \
        -e PGADMIN_DEFAULT_PASSWORD="$PGADMIN_PASSWORD" \
        -e PGADMIN_CONFIG_SERVER_MODE=False \
        -e PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED=False \
        -v "$PGADMIN_CONFIG_DIR/servers.json:/pgadmin4/servers.json:ro" \
        -v "$PGADMIN_CONFIG_DIR/pgpass:/pgadmin4/pgpass:ro" \
        -p 5050:80 \
        dpage/pgadmin4

    # Wait for pgAdmin to start (it copies config on startup)
    sleep 3

    echo ""
    echo "🔗 pgAdmin: http://localhost:5050"
    echo "   Email:    $PGADMIN_EMAIL"
    echo "   Password: $PGADMIN_PASSWORD"
    echo ""
    echo "   Database connection pre-configured as 'Eczema Dev'"
    echo "   Stop with: just pgadmin-stop"

# Stop pgAdmin
pgadmin-stop:
    docker stop pgadmin 2>/dev/null || true
    docker rm pgadmin 2>/dev/null || true
    @echo "🛑 pgAdmin stopped"

# Stop all services
stop:
    docker stop pgadmin 2>/dev/null || true
    docker rm pgadmin 2>/dev/null || true
    docker stop eczema-postgres-dev 2>/dev/null || true
    docker compose -f docker-compose.postgres.yml down --remove-orphans 2>/dev/null || true
    docker compose -f docker-compose.dev.yml down 2>/dev/null || true
    pkill -9 -f caddy 2>/dev/null || true
    @echo "🛑 Stopped"

# View logs
logs:
    docker compose -f docker-compose.postgres.yml logs -f

# Format code
fmt:
    bunx prettier --write "src/**/*.{ts,svelte}"

# Lint code
lint:
    bunx eslint src --ext .ts,.svelte

# Fix linting
lint-fix:
    bunx eslint src --ext .ts,.svelte --fix

# Update dependencies
update:
    bun update

# Check for outdated packages
outdated:
    bun outdated

# ========== BUILD & TEST ==========

# Type-check + build
build:
    bunx tsc --noEmit && bun run build
    @echo "✅ Built"

# Private: Ensure PostgreSQL is running with migrations applied
_ensure-db:
    #!/usr/bin/env bash
    set -e  # Exit on error

    # Load .env if exists
    if [[ -f .env ]]; then
        set -a && source .env && set +a
    fi

    # Use defaults if not set (matches env.ts defaults)
    POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
    POSTGRES_PORT="${POSTGRES_PORT:-5432}"
    POSTGRES_DB="${POSTGRES_DB:-eczema_helper}"
    POSTGRES_USER="${POSTGRES_USER:-eczema}"
    POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-eczema_dev}"

    # Start PostgreSQL if not running
    if ! docker compose -f docker-compose.postgres.yml ps 2>/dev/null | grep -q "postgres.*Up"; then
        echo "🐘 Starting PostgreSQL..."
        docker compose -f docker-compose.postgres.yml up -d
        echo "⏳ Waiting for PostgreSQL..."
        sleep 3
    fi

    # Always run migrations (idempotent)
    echo "🔄 Running migrations..."
    bun scripts/migrate.ts
    echo "✅ Database ready"

# Run all tests (unit + integration + e2e)
test: test-unit test-integration test-e2e
    @echo "✅ All tests passed!"

# Run unit tests only (no DB needed)
test-unit:
    bunx vitest run --exclude "tests/integration/**"

# Run integration tests only
test-integration: _ensure-db
    bunx vitest run tests/integration

# Run E2E tests only with Playwright (requires: just dev running)
test-e2e: _ensure-db
    @echo "⚠️  Make sure 'just dev' is running in another terminal!"
    bunx playwright test

# Run E2E tests with UI mode (requires: just dev running)
test-e2e-ui: _ensure-db
    @echo "⚠️  Make sure 'just dev' is running in another terminal!"
    bunx playwright test --ui

# Run tests in watch mode
test-watch:
    bunx vitest

# Run all checks (tests + build + type check)
check:
    #!/usr/bin/env bash
    # Check Node.js version
    NODE_VERSION=$(node --version 2>/dev/null | sed 's/v//')
    REQUIRED_NODE="20.15.0"
    if ! node -e "process.exit(process.version.slice(1).localeCompare('$REQUIRED_NODE', undefined, {numeric: true}) >= 0 ? 0 : 1)" 2>/dev/null; then
        echo "❌ Node.js $NODE_VERSION is too old. Required: $REQUIRED_NODE+"
        echo "   Run: just setup"
        exit 1
    fi
    echo "✅ Node.js $NODE_VERSION"
    echo ""
    
    # Run all tests
    just test
    
    # Type check and build
    echo ""
    echo "🔍 Type checking..."
    bunx tsc --noEmit
    echo ""
    echo "🏗️  Building..."
    bun run build
    echo ""
    echo "✅ All checks passed!"

# Clean build artifacts
clean:
    rm -rf build .svelte-kit node_modules/.cache

# ========== DATABASE ==========

# Run database migrations
migrate:
    #!/usr/bin/env bash
    set -a; [[ -f .env ]] && source .env; set +a
    bun scripts/migrate.ts

# Reset database (⚠️ destructive)
db-reset:
    #!/usr/bin/env bash
    read -p "Reset database? [y/N] " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]] && docker compose -f docker-compose.postgres.yml down -v && docker compose -f docker-compose.postgres.yml up -d && echo "✅ Reset" || echo "❌ Cancelled"

# Open database shell
db-shell:
    docker compose -f docker-compose.postgres.yml exec postgres psql -U eczema -d eczema_helper

# Clean up orphaned test data (run if tests crash mid-way)
test-cleanup:
    #!/usr/bin/env bash
    docker compose -f docker-compose.postgres.yml exec postgres psql -U eczema -d eczema_helper -c "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-%@example.com'); DELETE FROM user_children WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-%@example.com'); DELETE FROM children WHERE id NOT IN (SELECT child_id FROM user_children); DELETE FROM users WHERE email LIKE 'test-%@example.com';"
    @echo "✅ Test data cleaned"

# Backup database
backup:
    #!/usr/bin/env bash
    mkdir -p backups
    DATE=$(date +%Y-%m-%d-%H%M%S)
    docker compose -f docker-compose.postgres.yml exec -T postgres pg_dump -U eczema -d eczema_helper | gzip > "backups/eczema-${DATE}.sql.gz"
    echo "✅ backups/eczema-${DATE}.sql.gz"

# ========== DEPLOYMENT ==========

# Set these env vars: DEPLOY_HOST, DEPLOY_USER, DEPLOY_DIR

# Build Docker image
build-image tag="latest":
    docker build -t eczema-tracker:{{tag}} .
    @echo "✅ Built eczema-tracker:{{tag}}"

# Deploy to VPS
deploy tag="latest": (build-image tag)
    #!/usr/bin/env bash
    : "${DEPLOY_HOST:?Need DEPLOY_HOST env var}"
    DEPLOY_USER="${DEPLOY_USER:-deploy}"
    DEPLOY_DIR="${DEPLOY_DIR:-/opt/eczema-tracker}"
    TAG="{{tag}}"
    
    echo "🚀 Deploying to $DEPLOY_HOST..."
    docker save eczema-tracker:$TAG | gzip > /tmp/eczema-tracker-$TAG.tar.gz
    scp /tmp/eczema-tracker-$TAG.tar.gz $DEPLOY_USER@$DEPLOY_HOST:/tmp/
    
    ssh $DEPLOY_USER@$DEPLOY_HOST "cd $DEPLOY_DIR && TAG=$TAG bash -c 'gunzip -c /tmp/eczema-tracker-\$TAG.tar.gz | docker load && rm /tmp/eczema-tracker-\$TAG.tar.gz && docker compose run --rm app bun run db:migrate && docker compose up -d app'"
    
    for i in {1..30}; do
        ssh $DEPLOY_USER@$DEPLOY_HOST "curl -sf http://localhost:3000/api/health" && { echo "✅ Deployed"; break; } || sleep 2
    done
    rm /tmp/eczema-tracker-$TAG.tar.gz

# Quick redeploy (no build)
redeploy:
    #!/usr/bin/env bash
    : "${DEPLOY_HOST:?Need DEPLOY_HOST}"
    ssh "${DEPLOY_USER:-deploy}@$DEPLOY_HOST" "cd ${DEPLOY_DIR:-/opt/eczema-tracker} && docker compose up -d app"
    echo "✅ Redeployed"

# Check remote health
health:
    #!/usr/bin/env bash
    : "${DEPLOY_HOST:?Need DEPLOY_HOST}"
    curl -sf "https://$DEPLOY_HOST/api/health" | jq . || echo "❌ Health check failed"

# View remote logs
logs-remote service="app" lines="50":
    #!/usr/bin/env bash
    : "${DEPLOY_HOST:?Need DEPLOY_HOST}"
    ssh "${DEPLOY_USER:-deploy}@$DEPLOY_HOST" "cd ${DEPLOY_DIR:-/opt/eczema-tracker} && docker compose logs --tail={{lines}} -f {{service}}"

# Remote backup
backup-remote:
    #!/usr/bin/env bash
    : "${DEPLOY_HOST:?Need DEPLOY_HOST}"
    ssh "${DEPLOY_USER:-deploy}@$DEPLOY_HOST" "/opt/eczema-backup/backup-db.sh"

# Sync to offsite
backup-sync:
    #!/usr/bin/env bash
    : "${DEPLOY_HOST:?Need DEPLOY_HOST}"
    ssh "${DEPLOY_USER:-deploy}@$DEPLOY_HOST" "/opt/eczema-backup/offsite-sync.sh"

# Check VPS disk space
check-disk:
    #!/usr/bin/env bash
    : "${DEPLOY_HOST:?Need DEPLOY_HOST}"
    ssh "${DEPLOY_USER:-deploy}@$DEPLOY_HOST" "df -h / /data /backups 2>/dev/null || df -h /"

# ========== UTILITY ==========

# Generate .env template
env-template:
    #!/usr/bin/env bash
    printf '%s\n' \
        "# Database connection" \
        "POSTGRES_HOST=localhost" \
        "POSTGRES_PORT=5432" \
        "POSTGRES_DB=eczema_helper" \
        "POSTGRES_USER=eczema" \
        "POSTGRES_PASSWORD=eczema_dev" \
        "" \
        "# Session" \
        "SESSION_SECRET=change-me-32-char-min" \
        "" \
        "# pgAdmin (optional, for local dev)" \
        "PGADMIN_EMAIL=admin@local.dev" \
        "PGADMIN_PASSWORD=admin" \
        "" \
        "# Deployment" \
        "DEPLOY_HOST=your-vps-ip" \
        "DEPLOY_USER=deploy" \
        "DEPLOY_DIR=/opt/eczema-tracker" \
        "" \
        "# AI" \
        "CLAUDE_API_KEY=your-api-key" \
        "" \
        "# Google OAuth (optional)" \
        "GOOGLE_CLIENT_ID=your-client-id" \
        "GOOGLE_CLIENT_SECRET=your-client-secret"

# Install git hooks
setup-hooks:
    #!/usr/bin/env bash
    mkdir -p .git/hooks
    printf '#!/bin/bash\nset -e\nbunx tsc --noEmit\nbunx vitest run --changed\nbunx prettier --check "src/**/*.{ts,svelte}"\n' > .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit
    @echo "✅ Pre-commit hook installed"

# Show help
help:
    @echo "Eczema Tracker - Quick Commands:"
    @echo ""
    @echo "Setup:"
    @echo "  just setup            - Install all tools"
    @echo "  just check-tools      - Verify installation"
    @echo "  just setup-certs      - Generate HTTPS certs"
    @echo ""
    @echo "Development:"
    @echo "  just dev              - Start dev server"
    @echo "  just dev-db           - Start PostgreSQL only"
    @echo "  just pgadmin          - Start pgAdmin (auto-configured)"
    @echo "  just stop             - Stop all services"
    @echo "  just logs             - View logs"
    @echo ""
    @echo "Build & Test:"
    @echo "  just build            - Type-check and build"
    @echo "  just check            - Run ALL tests + build + type check"
    @echo "  just test             - Run ALL tests (unit + integration + e2e)"
    @echo "  just test-unit        - Run unit tests only"
    @echo "  just test-integration - Run integration tests (auto-starts DB)"
    @echo "  just test-e2e         - Run E2E tests with Playwright (needs dev-db)"
    @echo "  just test-e2e-ui      - Run E2E tests with UI mode"
    @echo ""
    @echo "Database:"
    @echo "  just db-reset         - Reset database"
    @echo "  just db-shell         - Open psql shell"
    @echo "  just backup           - Backup database"
    @echo ""
    @echo "Deploy:"
    @echo "  just deploy [TAG]     - Deploy to VPS"
    @echo "  just health           - Check remote health"
    @echo ""
    @echo "Full list: just --list"
