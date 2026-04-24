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
    echo "✅ Setup complete! Run 'just dev'."

# macOS setup via Homebrew
setup-macos:
    #!/usr/bin/env bash
    command -v brew &> /dev/null || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    if ! node -e "process.exit(process.version.slice(1).localeCompare('20.15.0', undefined, {numeric: true}) >= 0 ? 0 : 1)" 2>/dev/null; then
        brew install node@20
        echo 'export PATH="/usr/local/opt/node@20/bin:$PATH"' >> ~/.zshrc
        echo "⚠️  Run: source ~/.zshrc"
    fi

    brew install just mkcert
    command -v docker &> /dev/null || echo "⚠️  Install Docker Desktop manually (needed for 'just rollback')"
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
        echo "⚠️  Install manually: Bun, Docker, mkcert"
        exit 1
    fi

# Debian/Ubuntu setup
setup-linux-debian:
    #!/usr/bin/env bash
    sudo apt-get update
    sudo apt-get install -y curl wget unzip gnupg2 ca-certificates lsb-release

    if ! node -e "process.exit(process.version.slice(1).localeCompare('20.15.0', undefined, {numeric: true}) >= 0 ? 0 : 1)" 2>/dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi

    command -v docker &> /dev/null || (sudo apt-get install -y docker.io docker-compose-plugin && sudo usermod -aG docker $USER)
    command -v mkcert &> /dev/null || (sudo curl -L "$(curl -s https://api.github.com/repos/FiloSottile/mkcert/releases/latest | grep 'browser_download_url.*linux-amd64' | cut -d'\"' -f4)" -o /usr/local/bin/mkcert && sudo chmod +x /usr/local/bin/mkcert)
    command -v just &> /dev/null || (curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /tmp && sudo mv /tmp/just /usr/local/bin/)
    command -v bun &> /dev/null || (curl -fsSL https://bun.sh/install | bash && echo "⚠️  Restart terminal")

    mkcert -install
    echo "✅ Debian/Ubuntu ready"

# RedHat/Fedora setup
setup-linux-redhat:
    #!/usr/bin/env bash
    sudo dnf install -y curl wget unzip

    if ! node -e "process.exit(process.version.slice(1).localeCompare('20.15.0', undefined, {numeric: true}) >= 0 ? 0 : 1)" 2>/dev/null; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo dnf install -y nodejs
    fi

    command -v docker &> /dev/null || (sudo dnf install -y docker docker-compose && sudo systemctl enable --now docker && sudo usermod -aG docker $USER)
    command -v mkcert &> /dev/null || (sudo curl -L "$(curl -s https://api.github.com/repos/FiloSottile/mkcert/releases/latest | grep 'browser_download_url.*linux-amd64' | cut -d'\"' -f4)" -o /usr/local/bin/mkcert && sudo chmod +x /usr/local/bin/mkcert)
    command -v just &> /dev/null || (curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /tmp && sudo mv /tmp/just /usr/local/bin/)
    command -v bun &> /dev/null || (curl -fsSL https://bun.sh/install | bash && echo "⚠️  Restart terminal")

    mkcert -install
    echo "✅ RedHat/Fedora ready"

# Verify tools installed
check-tools:
    #!/usr/bin/env bash
    for tool in node bun docker mkcert just; do
        if command -v "$tool" &> /dev/null; then
            echo "✅ $tool"
        else
            echo "❌ $tool"
        fi
    done

# Install git hooks
setup-hooks:
    #!/usr/bin/env bash
    mkdir -p .git/hooks
    printf '#!/bin/bash\nset -e\nbunx tsc --noEmit\nbunx prettier --check "src/**/*.{ts,svelte}"\n' > .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit
    @echo "✅ Pre-commit hook installed"

# ========== DEVELOPMENT ==========

# Start dev server (Vite only — backend infra is not yet wired)
dev:
    bun run dev -- --host 0.0.0.0

# Stop leftover processes
stop:
    pkill -9 -f caddy 2>/dev/null || true
    @echo "🛑 Stopped"

# View dev server logs (if backgrounded)
logs:
    @echo "Nothing to log in pure-frontend mode. When backend comes back, wire this to docker compose logs."

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

# ========== BUILD ==========

# Type-check + build
build:
    bunx tsc --noEmit && bun run build
    @echo "✅ Built"

# Full check (type check + build)
check:
    bunx tsc --noEmit
    bun run build
    @echo "✅ All checks passed!"

# Clean build artifacts
clean:
    rm -rf build .svelte-kit node_modules/.cache

# ========== DEPLOYMENT ==========

# Set env vars: DEPLOY_HOST, DEPLOY_USER
# Normal deploys happen automatically via CI on merge to main.

# Roll back to a specific GHCR image tag (git SHA or "latest")
rollback tag="latest":
    #!/usr/bin/env bash
    : "${DEPLOY_HOST:?Need DEPLOY_HOST env var}"
    DEPLOY_USER="${DEPLOY_USER:-deploy}"
    IMAGE="ghcr.io/jirigrill/eczema-helper:{{tag}}"

    echo "⏪ Rolling back to $IMAGE on $DEPLOY_HOST..."
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "
        docker pull $IMAGE &&
        IMAGE=$IMAGE docker compose -f /opt/eczema-tracker/docker-compose.prod.yml up -d &&
        echo '✅ Rollback complete'
    "

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
        "# Deployment" \
        "DEPLOY_HOST=your-vps-ip" \
        "DEPLOY_USER=deploy" \
        "DEPLOY_DIR=/opt/eczema-tracker" \
        "" \
        "# Backend env (unused until backend is wired up)" \
        "POSTGRES_HOST=localhost" \
        "POSTGRES_PORT=5432" \
        "POSTGRES_DB=eczema_helper" \
        "POSTGRES_USER=eczema" \
        "POSTGRES_PASSWORD=change-me" \
        "SESSION_SECRET=change-me-32-char-min"

# Show help
help:
    @echo "Eczema Tracker - Quick Commands:"
    @echo ""
    @echo "Setup:"
    @echo "  just setup        - Install all tools"
    @echo "  just check-tools  - Verify installation"
    @echo ""
    @echo "Development:"
    @echo "  just dev          - Start Vite dev server"
    @echo "  just stop         - Stop any leftover processes"
    @echo ""
    @echo "Build:"
    @echo "  just build        - Type-check + build"
    @echo "  just check        - Type-check + build"
    @echo "  just clean        - Clean build artifacts"
    @echo ""
    @echo "Deploy:"
    @echo "  just rollback [TAG] - Pull GHCR image and restart (default: latest)"
    @echo "  just health         - Check remote /api/health"
    @echo "  just logs-remote    - Tail remote logs"
    @echo ""
    @echo "Full list: just --list"
