# Justfile - Task runner for Eczema Tracker PWA
# https://github.com/casey/just
#
# Usage: just <recipe>
# Example: just dev

# Default recipe - show available commands
default:
    @just --list

# ============================================================================
# SETUP & INSTALLATION (Cross-platform: Linux & macOS)
# ============================================================================

# Install all required development tools (Bun, Docker, mkcert, Caddy, Just)
setup:
    #!/usr/bin/env bash
    set -euo pipefail
    
    OS=$(uname -s)
    echo "🔧 Setting up development environment for $OS..."
    
    if [[ "$OS" == "Darwin" ]]; then
        echo "🍎 Detected macOS"
        just setup-macos
    elif [[ "$OS" == "Linux" ]]; then
        echo "🐧 Detected Linux"
        just setup-linux
    else
        echo "❌ Unsupported operating system: $OS"
        exit 1
    fi
    
    echo "✅ Setup complete! Run 'just dev' to start development."

# Setup for macOS (requires Homebrew)
setup-macos:
    #!/usr/bin/env bash
    set -euo pipefail
    
    echo "🍎 Setting up macOS development environment..."
    
    # Check for Homebrew
    if ! command -v brew &> /dev/null; then
        echo "📦 Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # Install required tools
    echo "📦 Installing required tools via Homebrew..."
    brew install --quiet just || echo "✓ just already installed"
    brew install --quiet mkcert || echo "✓ mkcert already installed"
    brew install --quiet caddy || echo "✓ caddy already installed"
    
    # Install Docker Desktop
    if ! command -v docker &> /dev/null; then
        echo "📦 Installing Docker Desktop..."
        echo "⚠️  Please download and install Docker Desktop from https://www.docker.com/products/docker-desktop"
        echo "   Then run 'just setup' again."
        exit 1
    fi
    
    # Install Bun
    if ! command -v bun &> /dev/null; then
        echo "📦 Installing Bun..."
        curl -fsSL https://bun.sh/install | bash
        echo "⚠️  Please restart your terminal or run: source ~/.bashrc or source ~/.zshrc"
    fi
    
    # Setup mkcert CA
    echo "🔐 Setting up mkcert CA..."
    mkcert -install
    
    echo "✅ macOS setup complete!"

# Setup for Linux (Ubuntu/Debian)
setup-linux:
    #!/usr/bin/env bash
    set -euo pipefail
    
    echo "🐧 Setting up Linux development environment..."
    
    # Detect Linux distribution
    if [[ -f /etc/debian_version ]]; then
        echo "📦 Detected Debian/Ubuntu system"
        just setup-linux-debian
    elif [[ -f /etc/redhat-release ]] || [[ -f /etc/fedora-release ]]; then
        echo "📦 Detected RedHat/Fedora system"
        just setup-linux-redhat
    elif [[ -f /etc/arch-release ]]; then
        echo "📦 Detected Arch Linux system"
        just setup-linux-arch
    else
        echo "⚠️  Unknown Linux distribution. Please install dependencies manually:"
        echo "   - Bun (https://bun.sh)"
        echo "   - Docker & Docker Compose"
        echo "   - mkcert (https://github.com/FiloSottile/mkcert)"
        echo "   - Caddy (https://caddyserver.com)"
        exit 1
    fi

# Setup for Debian/Ubuntu Linux
setup-linux-debian:
    #!/usr/bin/env bash
    set -euo pipefail
    
    echo "📦 Installing dependencies for Debian/Ubuntu..."
    
    # Update package list
    sudo apt-get update
    
    # Install base dependencies
    echo "📦 Installing base dependencies..."
    sudo apt-get install -y curl wget gnupg2 ca-certificates lsb-release software-properties-common
    
    # Install Docker
    if ! command -v docker &> /dev/null; then
        echo "📦 Installing Docker..."
        sudo apt-get install -y docker.io docker-compose-plugin
        sudo usermod -aG docker $USER
        echo "✅ Docker installed. Please log out and back in for group changes."
    else
        echo "✓ Docker already installed"
    fi
    
    # Install mkcert
    if ! command -v mkcert &> /dev/null; then
        echo "📦 Installing mkcert..."
        MKCERT_VERSION=$(curl -s https://api.github.com/repos/FiloSottile/mkcert/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
        wget -q "https://github.com/FiloSottile/mkcert/releases/download/${MKCERT_VERSION}/mkcert-${MKCERT_VERSION}-linux-amd64" -O /tmp/mkcert
        chmod +x /tmp/mkcert
        sudo mv /tmp/mkcert /usr/local/bin/mkcert
        echo "✅ mkcert installed"
    else
        echo "✓ mkcert already installed"
    fi
    
    # Install Caddy
    if ! command -v caddy &> /dev/null; then
        echo "📦 Installing Caddy..."
        sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
        sudo apt-get update
        sudo apt-get install -y caddy
        echo "✅ Caddy installed"
    else
        echo "✓ Caddy already installed"
    fi
    
    # Install Just
    if ! command -v just &> /dev/null; then
        echo "📦 Installing Just..."
        curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /tmp
        sudo mv /tmp/just /usr/local/bin/just
        echo "✅ Just installed"
    else
        echo "✓ Just already installed"
    fi
    
    # Install Bun
    if ! command -v bun &> /dev/null; then
        echo "📦 Installing Bun..."
        curl -fsSL https://bun.sh/install | bash
        echo "⚠️  Please restart your terminal or run: source ~/.bashrc"
        echo "   Or add to your PATH: export PATH=\"$HOME/.bun/bin:$PATH\""
    else
        echo "✓ Bun already installed"
    fi
    
    # Setup mkcert CA
    echo "🔐 Setting up mkcert CA..."
    mkcert -install
    
    echo "✅ Debian/Ubuntu setup complete!"

# Setup for RedHat/Fedora Linux
setup-linux-redhat:
    #!/usr/bin/env bash
    set -euo pipefail
    
    echo "📦 Installing dependencies for RedHat/Fedora..."
    
    # Install base dependencies
    sudo dnf install -y curl wget
    
    # Install Docker
    if ! command -v docker &> /dev/null; then
        echo "📦 Installing Docker..."
        sudo dnf install -y docker docker-compose
        sudo systemctl enable docker
        sudo systemctl start docker
        sudo usermod -aG docker $USER
        echo "✅ Docker installed. Please log out and back in for group changes."
    else
        echo "✓ Docker already installed"
    fi
    
    # Install mkcert
    if ! command -v mkcert &> /dev/null; then
        echo "📦 Installing mkcert..."
        MKCERT_VERSION=$(curl -s https://api.github.com/repos/FiloSottile/mkcert/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
        wget -q "https://github.com/FiloSottile/mkcert/releases/download/${MKCERT_VERSION}/mkcert-${MKCERT_VERSION}-linux-amd64" -O /tmp/mkcert
        chmod +x /tmp/mkcert
        sudo mv /tmp/mkcert /usr/local/bin/mkcert
        echo "✅ mkcert installed"
    else
        echo "✓ mkcert already installed"
    fi
    
    # Install Caddy
    if ! command -v caddy &> /dev/null; then
        echo "📦 Installing Caddy..."
        sudo dnf install -y 'dnf-command(copr)'
        sudo dnf copr enable -y @caddy/caddy
        sudo dnf install -y caddy
        echo "✅ Caddy installed"
    else
        echo "✓ Caddy already installed"
    fi
    
    # Install Just via Cargo
    if ! command -v just &> /dev/null; then
        echo "📦 Installing Just..."
        curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /tmp
        sudo mv /tmp/just /usr/local/bin/just
        echo "✅ Just installed"
    else
        echo "✓ Just already installed"
    fi
    
    # Install Bun
    if ! command -v bun &> /dev/null; then
        echo "📦 Installing Bun..."
        curl -fsSL https://bun.sh/install | bash
        echo "⚠️  Please restart your terminal or run: source ~/.bashrc"
        echo "   Or add to your PATH: export PATH=\"$HOME/.bun/bin:$PATH\""
    else
        echo "✓ Bun already installed"
    fi
    
    # Setup mkcert CA
    echo "🔐 Setting up mkcert CA..."
    mkcert -install
    
    echo "✅ RedHat/Fedora setup complete!"

# Setup for Arch Linux
setup-linux-arch:
    #!/usr/bin/env bash
    set -euo pipefail
    
    echo "📦 Installing dependencies for Arch Linux..."
    
    # Install packages from AUR and official repos
    echo "📦 Installing from official repositories..."
    sudo pacman -S --needed --noconfirm docker docker-compose caddy curl wget base-devel
    
    # Enable Docker
    if ! systemctl is-active --quiet docker; then
        echo "🔧 Enabling Docker..."
        sudo systemctl enable docker
        sudo systemctl start docker
        sudo usermod -aG docker $USER
        echo "✅ Docker enabled. Please log out and back in for group changes."
    fi
    
    # Install mkcert from AUR
    if ! command -v mkcert &> /dev/null; then
        echo "📦 Installing mkcert from AUR..."
        cd /tmp
        git clone https://aur.archlinux.org/mkcert.git
        cd mkcert
        makepkg -si --noconfirm
        cd -
        echo "✅ mkcert installed"
    else
        echo "✓ mkcert already installed"
    fi
    
    # Install Just from AUR
    if ! command -v just &> /dev/null; then
        echo "📦 Installing Just from AUR..."
        cd /tmp
        git clone https://aur.archlinux.org/just.git
        cd just
        makepkg -si --noconfirm
        cd -
        echo "✅ Just installed"
    else
        echo "✓ Just already installed"
    fi
    
    # Install Bun
    if ! command -v bun &> /dev/null; then
        echo "📦 Installing Bun..."
        curl -fsSL https://bun.sh/install | bash
        echo "⚠️  Please restart your terminal or run: source ~/.bashrc"
        echo "   Or add to your PATH: export PATH=\"$HOME/.bun/bin:$PATH\""
    else
        echo "✓ Bun already installed"
    fi
    
    # Setup mkcert CA
    echo "🔐 Setting up mkcert CA..."
    mkcert -install
    
    echo "✅ Arch Linux setup complete!"

# Generate HTTPS certificates for local development
setup-certs:
    #!/usr/bin/env bash
    set -euo pipefail
    
    echo "🔐 Generating HTTPS certificates..."
    
    # Get local IP
    OS=$(uname -s)
    if [[ "$OS" == "Darwin" ]]; then
        LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1)
    else
        LOCAL_IP=$(hostname -I | awk '{print $1}')
    fi
    
    if [[ -z "$LOCAL_IP" ]]; then
        echo "❌ Could not determine local IP address"
        exit 1
    fi
    
    echo "📍 Local IP detected: $LOCAL_IP"
    
    # Create certs directory
    mkdir -p certs
    
    # Generate certificates
    mkcert -cert-file certs/local.pem -key-file certs/local-key.pem \
        localhost 127.0.0.1 "$LOCAL_IP"
    
    echo "✅ Certificates generated in certs/"
    echo ""
    echo "📱 Next steps for mobile testing:"
    echo "   1. Find CA root: mkcert -CAROOT"
    echo "   2. Transfer rootCA.pem to your phone"
    echo "   3. Install and trust the certificate on your phone"
    echo ""
    echo "   iPhone: Settings > General > VPN & Device Management > Install Profile"
    echo "          Settings > General > About > Certificate Trust Settings > Enable Full Trust"
    echo "   Android: Settings > Security > Encryption & credentials > Install certificate > CA certificate"

# Verify all tools are installed correctly
check-tools:
    #!/usr/bin/env bash
    set -euo pipefail
    
    echo "🔍 Checking installed tools..."
    echo ""
    
    TOOLS=("bun" "docker" "mkcert" "caddy" "just")
    ALL_GOOD=true
    
    for tool in "${TOOLS[@]}"; do
        if command -v "$tool" &> /dev/null; then
            VERSION=$($tool --version 2>&1 | head -n1 || echo "installed")
            echo "✅ $tool: $VERSION"
        else
            echo "❌ $tool: NOT FOUND"
            ALL_GOOD=false
        fi
    done
    
    echo ""
    if [[ "$ALL_GOOD" == true ]]; then
        echo "✅ All tools installed correctly!"
        echo "   Run 'just setup-certs' to generate HTTPS certificates"
        echo "   Then run 'just dev' to start development"
    else
        echo "❌ Some tools are missing. Run 'just setup' to install them."
        exit 1
    fi

# ============================================================================
# DEVELOPMENT
# ============================================================================

# Start full development environment (Docker, Caddy, dev server)
dev:
    #!/usr/bin/env bash
    echo "🚀 Starting development environment..."
    docker compose -f docker-compose.dev.yml up -d
    echo "✅ Docker services started"
    echo "🔧 Starting Caddy (HTTPS proxy)..."
    caddy run --config Caddyfile &
    CADDY_PID=$!
    echo "✅ Caddy started (PID: $CADDY_PID)"
    echo "📱 Starting SvelteKit dev server..."
    bun run dev -- --host 0.0.0.0
    echo "🛑 Shutting down Caddy..."
    kill $CADDY_PID 2>/dev/null || true

# Start only Docker services (PostgreSQL)
dev-db:
    docker compose -f docker-compose.dev.yml up -d
    @echo "✅ Database running on localhost:5432"

# Stop all development services
stop:
    docker compose -f docker-compose.dev.yml down
    pkill -f "caddy run" 2>/dev/null || true
    @echo "🛑 All services stopped"

# View logs from all services
logs:
    docker compose -f docker-compose.dev.yml logs -f

# View app logs only
logs-app:
    docker compose -f docker-compose.dev.yml logs -f app

# View database logs only
logs-db:
    docker compose -f docker-compose.dev.yml logs -f postgres

# ============================================================================
# BUILD & TEST
# ============================================================================

# Type-check, build, and verify
build:
    bunx tsc --noEmit
    bun run build
    @echo "✅ Build successful"

# Run all tests
test:
    bunx vitest run
    @echo "✅ Unit tests passed"

# Run tests in watch mode
test-watch:
    bunx vitest

# Run E2E tests (requires dev environment running)
test-e2e:
    bun run test:e2e

# Run all checks (type-check, test, build)
check: test build
    @echo "✅ All checks passed"

# Clean build artifacts
clean:
    rm -rf build
    rm -rf .svelte-kit
    rm -rf node_modules/.cache
    @echo "🧹 Build artifacts cleaned"

# ============================================================================
# DATABASE
# ============================================================================

# Generate new migration
db-migrate-generate name:
    docker compose -f docker-compose.dev.yml exec app bun run db:generate -- {{name}}

# Run pending migrations
db-migrate:
    docker compose -f docker-compose.dev.yml exec app bun run db:migrate

# Rollback last migration
db-migrate-rollback:
    docker compose -f docker-compose.dev.yml exec app bun run db:rollback

# Reset database (⚠️ DESTRUCTIVE)
db-reset:
    @echo "⚠️  This will DELETE all data in the local database!"
    @read -p "Are you sure? [y/N] " -n 1 -r
    @echo
    @if [[ $REPLY =~ ^[Yy]$ ]]; then \
        docker compose -f docker-compose.dev.yml down -v; \
        docker compose -f docker-compose.dev.yml up -d; \
        echo "✅ Database reset"; \
    else \
        echo "❌ Cancelled"; \
    fi

# Open database shell
db-shell:
    docker compose -f docker-compose.dev.yml exec postgres psql -U eczema -d eczema

# ============================================================================
# DEPLOYMENT
# ============================================================================

# Set these environment variables or use .env file:
# DEPLOY_HOST - VPS hostname or IP
# DEPLOY_USER - SSH user (default: deploy)
# DEPLOY_DIR - Remote deployment directory (default: /opt/eczema-tracker)

# Build and tag Docker image for production
build-prod tag="latest":
    docker build -t eczema-tracker:{{tag}} .
    @echo "✅ Built eczema-tracker:{{tag}}"

# Deploy to VPS (full deployment)
deploy tag="latest": (build-prod tag)
    #!/usr/bin/env bash
    set -euo pipefail
    
    DEPLOY_HOST="${DEPLOY_HOST:-}"
    DEPLOY_USER="${DEPLOY_USER:-deploy}"
    DEPLOY_DIR="${DEPLOY_DIR:-/opt/eczema-tracker}"
    
    if [[ -z "$DEPLOY_HOST" ]]; then
        echo "❌ Error: Set DEPLOY_HOST environment variable"
        exit 1
    fi
    
    echo "🚀 Deploying to $DEPLOY_HOST..."
    
    # Save image to file and transfer
    echo "📦 Exporting Docker image..."
    docker save eczema-tracker:{{tag}} | gzip > /tmp/eczema-tracker-{{tag}}.tar.gz
    
    echo "📤 Transferring to server..."
    scp /tmp/eczema-tracker-{{tag}}.tar.gz $DEPLOY_USER@$DEPLOY_HOST:/tmp/
    
    echo "🔧 Loading and deploying on server..."
    ssh $DEPLOY_USER@$DEPLOY_HOST << 'EOF'
        set -euo pipefail
        cd {{DEPLOY_DIR}}
        
        # Load new image
        gunzip -c /tmp/eczema-tracker-{{tag}}.tar.gz | docker load
        rm /tmp/eczema-tracker-{{tag}}.tar.gz
        
        # Run migrations before deploying
        echo "🔄 Running database migrations..."
        docker compose run --rm app bun run db:migrate
        
        # Rolling update - start new container
        echo "🚀 Starting new version..."
        docker compose up -d app
        
        # Wait for health check
        echo "⏳ Waiting for health check..."
        for i in {1..30}; do
            if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
                echo "✅ Health check passed"
                break
            fi
            sleep 2
        done
        
        # Cleanup old images
        docker image prune -f
        
        echo "✅ Deployment complete"
EOF
    
    rm /tmp/eczema-tracker-{{tag}}.tar.gz
    echo "🎉 Successfully deployed to $DEPLOY_HOST"

# Quick deploy - just restart with latest image (no build)
deploy-quick:
    #!/usr/bin/env bash
    DEPLOY_HOST="${DEPLOY_HOST:-}"
    DEPLOY_USER="${DEPLOY_USER:-deploy}"
    DEPLOY_DIR="${DEPLOY_DIR:-/opt/eczema-tracker}"
    
    if [[ -z "$DEPLOY_HOST" ]]; then
        echo "❌ Error: Set DEPLOY_HOST environment variable"
        exit 1
    fi
    
    echo "🚀 Quick deploy to $DEPLOY_HOST..."
    ssh $DEPLOY_USER@$DEPLOY_HOST "cd $DEPLOY_DIR && docker compose up -d app"
    echo "✅ Quick deploy complete"

# Rollback to previous version
rollback:
    #!/usr/bin/env bash
    DEPLOY_HOST="${DEPLOY_HOST:-}"
    DEPLOY_USER="${DEPLOY_USER:-deploy}"
    DEPLOY_DIR="${DEPLOY_DIR:-/opt/eczema-tracker}"
    
    if [[ -z "$DEPLOY_HOST" ]]; then
        echo "❌ Error: Set DEPLOY_HOST environment variable"
        exit 1
    fi
    
    echo "⚠️  Rolling back to previous version on $DEPLOY_HOST..."
    ssh $DEPLOY_USER@$DEPLOY_HOST "cd $DEPLOY_DIR && docker compose rollback app"
    echo "✅ Rollback complete"

# ============================================================================
# BACKUP & MAINTENANCE
# ============================================================================

# Create database backup locally
db-backup-local:
    #!/usr/bin/env bash
    mkdir -p backups
    DATE=$(date +%Y-%m-%d-%H%M%S)
    docker compose -f docker-compose.dev.yml exec -T postgres pg_dump -U eczema -d eczema | gzip > backups/eczema-${DATE}.sql.gz
    echo "✅ Backup created: backups/eczema-${DATE}.sql.gz"

# Create encrypted backup on VPS
backup-remote:
    #!/usr/bin/env bash
    DEPLOY_HOST="${DEPLOY_HOST:-}"
    DEPLOY_USER="${DEPLOY_USER:-deploy}"
    
    if [[ -z "$DEPLOY_HOST" ]]; then
        echo "❌ Error: Set DEPLOY_HOST environment variable"
        exit 1
    fi
    
    echo "💾 Running remote backup on $DEPLOY_HOST..."
    ssh $DEPLOY_USER@$DEPLOY_HOST "/opt/eczema-backup/backup-db.sh"
    echo "✅ Remote backup complete"

# Sync backups to offsite storage (rclone required)
backup-offsite:
    #!/usr/bin/env bash
    DEPLOY_HOST="${DEPLOY_HOST:-}"
    DEPLOY_USER="${DEPLOY_USER:-deploy}"
    
    if [[ -z "$DEPLOY_HOST" ]]; then
        echo "❌ Error: Set DEPLOY_HOST environment variable"
        exit 1
    fi
    
    echo "☁️  Syncing to offsite storage..."
    ssh $DEPLOY_USER@$DEPLOY_HOST "/opt/eczema-backup/offsite-sync.sh"
    echo "✅ Offsite sync complete"

# Check disk space on VPS
check-disk:
    #!/usr/bin/env bash
    DEPLOY_HOST="${DEPLOY_HOST:-}"
    DEPLOY_USER="${DEPLOY_USER:-deploy}"
    
    if [[ -z "$DEPLOY_HOST" ]]; then
        echo "❌ Error: Set DEPLOY_HOST environment variable"
        exit 1
    fi
    
    echo "💽 Disk usage on $DEPLOY_HOST:"
    ssh $DEPLOY_USER@$DEPLOY_HOST "df -h / /data /backups 2>/dev/null || df -h /"

# Health check remote server
health:
    #!/usr/bin/env bash
    DEPLOY_HOST="${DEPLOY_HOST:-}"
    
    if [[ -z "$DEPLOY_HOST" ]]; then
        echo "❌ Error: Set DEPLOY_HOST environment variable"
        exit 1
    fi
    
    echo "🏥 Health check: https://$DEPLOY_HOST/api/health"
    curl -sf "https://$DEPLOY_HOST/api/health" | jq . || echo "❌ Health check failed"

# View remote logs
logs-remote service="app" lines="50":
    #!/usr/bin/env bash
    DEPLOY_HOST="${DEPLOY_HOST:-}"
    DEPLOY_USER="${DEPLOY_USER:-deploy}"
    DEPLOY_DIR="${DEPLOY_DIR:-/opt/eczema-tracker}"
    
    if [[ -z "$DEPLOY_HOST" ]]; then
        echo "❌ Error: Set DEPLOY_HOST environment variable"
        exit 1
    fi
    
    ssh $DEPLOY_USER@$DEPLOY_HOST "cd $DEPLOY_DIR && docker compose logs --tail={{lines}} -f {{service}}"

# ============================================================================
# UTILITY
# ============================================================================

# Format code
fmt:
    bunx prettier --write "src/**/*.{ts,svelte}"
    @echo "✅ Code formatted"

# Lint code
lint:
    bunx eslint src --ext .ts,.svelte
    @echo "✅ Linting passed"

# Fix linting issues
lint-fix:
    bunx eslint src --ext .ts,.svelte --fix
    @echo "✅ Lint issues fixed"

# Update dependencies
update:
    bun update
    @echo "✅ Dependencies updated"

# Security audit
audit:
    bun audit

# Check for outdated dependencies
outdated:
    bun outdated

# Generate env file template
env-template:
    @cat << 'EOF'
# Copy to .env and fill in your values

# Database
DATABASE_URL=postgresql://eczema:password@localhost:5432/eczema

# Session
SESSION_SECRET=generate-a-32-char-secret-here

# Encryption
ENCRYPTION_KEY=base64-encoded-32-byte-key

# Deployment (for just deploy commands)
DEPLOY_HOST=your-vps-ip-or-domain
DEPLOY_USER=deploy
DEPLOY_DIR=/opt/eczema-tracker

# AI (Claude Vision)
CLAUDE_API_KEY=your-api-key

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Backup (optional)
BACKUP_ENCRYPTION_KEY_FILE=/opt/eczema-backup/backup.key
EOF

# Setup pre-commit hooks
setup-hooks:
    #!/usr/bin/env bash
    cat > .git/hooks/pre-commit << 'EOF'
    #!/bin/bash
    set -e
    echo "Running pre-commit checks..."
    bunx tsc --noEmit
    bunx vitest run --changed
    bunx prettier --check "src/**/*.{ts,svelte}"
    echo "✅ Pre-commit checks passed"
EOF
    chmod +x .git/hooks/pre-commit
    @echo "✅ Pre-commit hook installed"

# Help
help:
    @echo "Eczema Tracker PWA - Justfile Commands"
    @echo ""
    @echo "Setup (First Time):"
    @echo "  just setup            - Install all tools (auto-detects macOS/Linux)"
    @echo "  just check-tools      - Verify all tools are installed"
    @echo "  just setup-certs      - Generate HTTPS certificates for local IP"
    @echo ""
    @echo "Development:"
    @echo "  just dev              - Start full dev environment (Docker + Caddy + dev server)"
    @echo "  just dev-db           - Start only database"
    @echo "  just stop             - Stop all dev services"
    @echo "  just logs             - View all service logs"
    @echo ""
    @echo "Build & Test:"
    @echo "  just build            - Type-check and build"
    @echo "  just test             - Run unit tests"
    @echo "  just test-e2e         - Run E2E tests"
    @echo "  just check            - Run all checks (test + build)"
    @echo ""
    @echo "Database:"
    @echo "  just db-migrate       - Run pending migrations"
    @echo "  just db-migrate-generate NAME  - Generate new migration"
    @echo "  just db-reset         - Reset local database (⚠️ DESTRUCTIVE)"
    @echo "  just db-shell         - Open database shell"
    @echo ""
    @echo "Deployment:"
    @echo "  just deploy [TAG]     - Deploy to VPS (requires DEPLOY_HOST env var)"
    @echo "  just deploy-quick     - Quick restart on VPS"
    @echo "  just rollback         - Rollback to previous version"
    @echo "  just health           - Check remote health endpoint"
    @echo ""
    @echo "Backup:"
    @echo "  just db-backup-local  - Create local database backup"
    @echo "  just backup-remote    - Create encrypted backup on VPS"
    @echo "  just backup-offsite   - Sync to offsite storage"
    @echo ""
    @echo "Utility:"
    @echo "  just fmt              - Format code"
    @echo "  just lint             - Lint code"
    @echo "  just update           - Update dependencies"
    @echo "  just env-template     - Generate .env template"
    @echo "  just setup-hooks      - Install git pre-commit hooks"
    @echo ""
    @echo "For more info: just --list"
