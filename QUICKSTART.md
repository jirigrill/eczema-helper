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

## Step 5: Generate HTTPS Certificates

```bash
just setup-certs
```

This creates HTTPS certificates for your local IP address (e.g., `192.168.1.x`).

**Important for mobile testing:** You must install the mkcert CA on your phone:

1. Run `mkcert -CAROOT` to find the CA file location
2. Transfer `rootCA.pem` to your phone
3. **iPhone**: Settings > General > VPN & Device Management > Install Profile  
   Then: Settings > General > About > Certificate Trust Settings > Enable Full Trust
4. **Android**: Settings > Security > Encryption & credentials > Install certificate > CA certificate

## Step 6: Start Development Server

```bash
just dev
```

This starts:

- PostgreSQL in Docker
- Caddy with HTTPS on port 443
- SvelteKit dev server on port 5173

## Step 7: Access from Your Phone

On your phone (connected to same WiFi):

1. Open Safari (iOS) or Chrome (Android)
2. Navigate to `https://YOUR_COMPUTER_IP`
3. Accept/install the certificate if prompted
4. You should see the app!

Find your computer's IP:

```bash
# Linux
hostname -I

# macOS
ipconfig getifaddr en0
```

## Common Commands

```bash
just dev              # Start full dev environment
just stop             # Stop all services
just build            # Type-check and build
just test             # Run tests
just check            # Run all checks (test + build + lint)
just db-migrate       # Run database migrations
just logs             # View logs
```

## Troubleshooting

**Certificate warnings on phone:**

- Make sure you installed the mkcert root CA on your phone (Step 4)
- Ensure phone and computer are on same WiFi

**Cannot connect / Connection refused:**
The firewall is blocking the ports. Allow them:

```bash
# Ubuntu/Debian with UFW
sudo ufw allow 8443/tcp   # HTTPS via Caddy
sudo ufw allow 5173/tcp   # HTTP direct
sudo ufw reload

# Or open all ports for local network (less secure)
sudo ufw allow from 192.168.0.0/16 to any port 8443

# Check status
sudo ufw status
```

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

- Check firewall rules above
- Verify Caddy is running: `just logs`
- Check IP address matches: `hostname -I`

## Next Steps

- Read `docs/README.md` for project overview
- Check `docs/phases/phase-0-scaffold.md` for detailed Phase 0 implementation
- Run `just help` to see all available commands

## Quick Reference

```bash
# First time setup
just setup && just setup-certs

# Daily development workflow
just dev              # Start
# ... develop ...
just stop             # Stop

# Before committing
just check            # Run all tests and checks
```
