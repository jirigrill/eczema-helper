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

### Install mkcert Root CA on Your Computer

You must trust the certificate authority on your laptop/desktop to avoid "This connection is not private" warnings:

**macOS:**

```bash
# Find and open the certificate
open "$(mkcert -CAROOT)/rootCA.pem"

# Or manually:
# 1. Open Keychain Access
# 2. Find "mkcert" certificate under System Roots
# 3. Double-click → Trust → "Always Trust"
```

**Ubuntu/Debian:**

```bash
sudo cp "$(mkcert -CAROOT)/rootCA.pem" /usr/local/share/ca-certificates/mkcert.crt
sudo update-ca-certificates
```

**RedHat/Fedora:**

```bash
sudo cp "$(mkcert -CAROOT)/rootCA.pem" /etc/pki/ca-trust/source/anchors/mkcert.crt
sudo update-ca-trust extract
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

**"This connection is not private" / Certificate warning:**

This is expected! The HTTPS certificate is self-signed. To fix it:

1. **If on your laptop/computer**: Install the mkcert root CA (see Step 5 above)
2. **If on your phone**: Install the mkcert root CA (see Step 5 above)
3. **Quick workaround**: Click "Advanced" → "Proceed" (accept the risk)

**Certificate warnings on phone:**

- Make sure you installed the mkcert root CA on your phone (Step 5)
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
