#!/usr/bin/env bash
# pgAdmin setup script - creates config files and starts container
set -e

# Load .env if exists
if [[ -f .env ]]; then
    set -a && source .env && set +a
fi

# Use defaults if not set
POSTGRES_DB="${POSTGRES_DB:-eczema_helper}"
POSTGRES_USER="${POSTGRES_USER:-eczema}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-eczema_dev}"
PGADMIN_EMAIL="${PGADMIN_EMAIL:-admin@local.dev}"
PGADMIN_PASSWORD="${PGADMIN_PASSWORD:-admin}"

# Stop existing pgadmin container if running
docker stop pgadmin 2>/dev/null || true
docker rm pgadmin 2>/dev/null || true

# Create persistent config directory
PGADMIN_CONFIG_DIR=".pgadmin"
mkdir -p "$PGADMIN_CONFIG_DIR/data"

# Create servers.json for auto-configuration
cat > "$PGADMIN_CONFIG_DIR/servers.json" << EOF
{
  "Servers": {
    "1": {
      "Name": "Eczema Dev",
      "Group": "Servers",
      "Host": "eczema-postgres-dev",
      "Port": 5432,
      "MaintenanceDB": "$POSTGRES_DB",
      "Username": "$POSTGRES_USER",
      "SSLMode": "prefer",
      "PassFile": "/pgpass"
    }
  }
}
EOF

# Create pgpass file for auto-login
cat > "$PGADMIN_CONFIG_DIR/pgpass" << EOF
eczema-postgres-dev:5432:*:$POSTGRES_USER:$POSTGRES_PASSWORD
EOF
chmod 600 "$PGADMIN_CONFIG_DIR/pgpass"

# Determine network from actual postgres container
NETWORK_NAME=$(docker inspect eczema-postgres-dev --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' 2>/dev/null)
if [[ -z "$NETWORK_NAME" ]]; then
    echo "❌ PostgreSQL container not running. Start it first: just dev-db"
    exit 1
fi

# Start pgAdmin container with persistent data volume
docker run -d --name pgadmin \
    --network "$NETWORK_NAME" \
    -e PGADMIN_DEFAULT_EMAIL="$PGADMIN_EMAIL" \
    -e PGADMIN_DEFAULT_PASSWORD="$PGADMIN_PASSWORD" \
    -e PGADMIN_CONFIG_SERVER_MODE=False \
    -e PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED=False \
    -v "$(pwd)/$PGADMIN_CONFIG_DIR/servers.json:/pgadmin4/servers.json:ro" \
    -v "$(pwd)/$PGADMIN_CONFIG_DIR/pgpass:/pgpass:ro" \
    -v "$(pwd)/$PGADMIN_CONFIG_DIR/data:/var/lib/pgadmin" \
    -v "$HOME/.ssh/id_rsa:/pgadmin-ssh/id_rsa:ro" \
    -p 5050:80 \
    dpage/pgadmin4

# Wait for pgAdmin to start
sleep 3

echo ""
echo "🔗 pgAdmin: http://localhost:5050"
echo "   Email:    $PGADMIN_EMAIL"
echo "   Password: $PGADMIN_PASSWORD"
echo ""
echo "   Server: 'Eczema Dev' (pre-configured)"
echo ""
echo "   First time setup:"
echo "   1. Right-click 'Eczema Dev' → Query Tool"
echo "   2. File → Preferences → Query Tool → Keyboard shortcuts"
echo "   3. Set 'Execute query' to Shift+Option+Enter"
echo "   (Settings persist across restarts)"
echo ""
echo "   Stop with: just pgadmin-stop"
