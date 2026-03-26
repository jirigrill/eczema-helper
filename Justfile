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
    echo "✅ Setup complete! Run 'just dev' to start."

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
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    mkdir -p certs
    mkcert -cert-file certs/local.pem -key-file certs/local-key.pem localhost 127.0.0.1 "$LOCAL_IP"
    echo "✅ Certificates generated for IP: $LOCAL_IP"
    echo "📱 Install rootCA on phone: mkcert -CAROOT"

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
    command -v bun &> /dev/null || { echo "❌ Bun not found. Run: just setup"; exit 1; }
    node -e "process.exit(process.version.slice(1).localeCompare('20.15.0', undefined, {numeric: true}) >= 0 ? 0 : 1)" 2>/dev/null || { echo "❌ Node.js 20.15.0+ required. Run: just setup"; exit 1; }
    
    pkill -f "caddy run" 2>/dev/null || true
    docker compose -f docker-compose.postgres.yml up -d
    echo "✅ PostgreSQL ready"
    caddy run --config Caddyfile &
    echo "✅ Caddy started"
    bun run dev -- --host 0.0.0.0
    pkill -f "caddy run" 2>/dev/null || true

# Start PostgreSQL only
dev-db:
    docker compose -f docker-compose.postgres.yml up -d
    @echo "✅ PostgreSQL on localhost:5432"

# Stop all services
stop:
    docker compose -f docker-compose.postgres.yml down 2>/dev/null || true
    docker compose -f docker-compose.dev.yml down 2>/dev/null || true
    pkill -f caddy 2>/dev/null || true
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

# Run tests
test:
    bunx vitest run

# Run tests in watch mode
test-watch:
    bunx vitest

# Run all checks (includes Node.js version check)
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
    
    # Run tests and build
    bunx vitest run
    bunx tsc --noEmit && bun run build
    echo "✅ All checks passed"

# Clean build artifacts
clean:
    rm -rf build .svelte-kit node_modules/.cache

# ========== DATABASE ==========

# Run migrations
db-migrate:
    bun run db:migrate

# Generate migration
db-generate name:
    bun run db:generate -- {{name}}

# Rollback migration
db-rollback:
    bun run db:rollback

# Reset database (⚠️ destructive)
db-reset:
    #!/usr/bin/env bash
    read -p "Reset database? [y/N] " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]] && docker compose -f docker-compose.postgres.yml down -v && docker compose -f docker-compose.postgres.yml up -d && echo "✅ Reset" || echo "❌ Cancelled"

# Open database shell
db-shell:
    docker compose -f docker-compose.postgres.yml exec postgres psql -U eczema -d eczema

# Backup database
backup:
    #!/usr/bin/env bash
    mkdir -p backups
    DATE=$(date +%Y-%m-%d-%H%M%S)
    docker compose -f docker-compose.postgres.yml exec -T postgres pg_dump -U eczema -d eczema | gzip > "backups/eczema-${DATE}.sql.gz"
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

# Rollback deployment
rollback:
    #!/usr/bin/env bash
    : "${DEPLOY_HOST:?Need DEPLOY_HOST}"
    ssh "${DEPLOY_USER:-deploy}@$DEPLOY_HOST" "cd ${DEPLOY_DIR:-/opt/eczema-tracker} && docker compose rollback app"
    echo "✅ Rolled back"

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
        "# Database" \
        "DATABASE_URL=postgresql://eczema:CHANGEME_AT_localhost:5432/eczema" \
        "" \
        "# Session" \
        "SESSION_SECRET=change-me-32-char-min" \
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
    @echo "  just stop             - Stop all services"
    @echo "  just logs             - View logs"
    @echo ""
    @echo "Build & Test:"
    @echo "  just build            - Type-check and build"
    @echo "  just test             - Run tests"
    @echo "  just check            - Run all checks"
    @echo ""
    @echo "Database:"
    @echo "  just db-migrate       - Run migrations"
    @echo "  just db-generate NAME - Create migration"
    @echo "  just db-reset         - Reset database"
    @echo "  just backup           - Backup database"
    @echo ""
    @echo "Deploy:"
    @echo "  just deploy [TAG]     - Deploy to VPS"
    @echo "  just health           - Check remote health"
    @echo ""
    @echo "Full list: just --list"
