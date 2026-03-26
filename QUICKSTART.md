# Quick Start Guide

Get the Eczema Tracker PWA running locally in 5 minutes.

## Prerequisites

- Linux or macOS machine
- Git
- `curl` for installing Just

## Step 1: Install Just (Task Runner)

```bash
curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash
```

Or use your package manager:

- **macOS**: `brew install just`
- **Arch**: `pacman -S just`
- **Ubuntu**: Download binary from https://just.systems

## Step 2: Setup Development Environment

```bash
# Clone the repository
git clone <your-repo-url>
cd eczema-helper

# Install all required tools (Bun, Docker, mkcert, Caddy)
# This auto-detects your OS and installs appropriately
just setup

# Verify everything is installed
just check-tools
```

**What gets installed:**

- Bun (JavaScript runtime)
- Docker & Docker Compose
- mkcert (HTTPS certificates)
- Caddy (reverse proxy)

## Step 3: Install Dependencies

```bash
# Install Node.js dependencies
bun install
```

## Step 4: Configure Environment

```bash
# Generate .env template
just env-template > .env

# Edit .env with your values (optional for first run)
nano .env
```

**Note:** The dev environment uses Docker for PostgreSQL, so the default `.env` values work for initial testing.

## Step 5: Generate HTTPS Certificates and Install Root CA

```bash
just setup-certs
```

This creates HTTPS certificates for your local IP address.

### Install mkcert Root CA on Your MacBook

`just setup-certs` generates the certs but you also need your laptop to trust the mkcert CA:

```bash
# Install mkcert via Homebrew (if not done by just setup)
brew install mkcert

# Install the local CA into macOS keychain
mkcert -install
```

### Install mkcert Root CA on Your Phone

**iPhone:**

1. Run `mkcert -CAROOT` on your computer to find the certificate
2. Transfer `rootCA.pem` to your iPhone (AirDrop, email, cloud)
3. Open the file → Install Profile when prompted
4. Go to: Settings > General > About > Certificate Trust Settings
5. Enable "Full Trust" for the mkcert certificate

**Android:**

1. Transfer `rootCA.pem` to your phone
2. Go to: Settings > Security > Encryption & credentials
3. Tap "Install a certificate" > "CA certificate"
4. Select the `rootCA.pem` file
5. Confirm installation

## Step 6: Start Development Server

```bash
just dev
```

This starts:

- PostgreSQL in Docker
- Caddy with HTTPS on port **8443**
- SvelteKit dev server on port 5173

`just dev` prints the exact URLs when ready, including the HTTPS address for your phone.

## Step 7: Access from Your Phone

On your phone (connected to same WiFi):

1. Open Safari (iOS) or Chrome (Android)
2. Navigate to `https://YOUR_COMPUTER_IP:8443` (shown in `just dev` output)
3. You should see the app without certificate warnings

## Common Commands

```bash
just dev              # Start full dev environment
just stop             # Stop all services
just build            # Type-check and build
just test             # Run unit tests
just test-integration # Run integration tests (needs dev-db)
just check            # Run all checks (test + build)
just logs             # View logs
```

## Troubleshooting

**"This connection is not private" / Certificate warning:**

The mkcert root CA is not trusted yet. Install it:

1. **On your laptop**: run `mkcert -install` (see Step 5 above)
2. **On your phone**: install `rootCA.pem` (see Step 5 above)

Note: clicking "Advanced → Proceed" does not work on iPhone Safari and breaks service workers — the CA must be properly installed.

**Certificate warnings on phone:**

- Make sure you installed the mkcert root CA on your phone (Step 5)
- Ensure phone and computer are on same WiFi

**Docker permission denied:**

```bash
sudo usermod -aG docker $USER
# Log out and back in
```

**Port already in use:**

```bash
just stop             # Stop existing services
lsof -i :5173         # Find process using port
kill <PID>            # Kill it
```

**Can't connect from phone:**

- Ensure phone and laptop are on the same WiFi
- Check the URL includes the port: `https://YOUR_IP:8443`
- Verify Caddy is running — `just dev` output should show "✅ Caddy ready"

## Next Steps

- Read `docs/README.md` for project overview
- Check `docs/phases/phase-0-scaffold.md` for detailed Phase 0 implementation
- See `docs/architecture/deployment.md` for:
  - Full architecture diagrams and explanations
  - Production VPS deployment guide
  - Nginx reverse proxy configuration
  - Backup strategy and monitoring setup
- Run `just help` to see all available commands

## Quick Reference

```bash
# First time setup
just setup && bun install && just setup-certs

# Daily development workflow
just dev              # Start
# ... develop ...
just stop             # Stop

# Before committing
just check            # Run all tests and checks
```
