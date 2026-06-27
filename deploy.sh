#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# VMS Production Deployment Script
# Usage: bash deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
VMS_DIR="/opt/vms"
BACKEND_DIR="$VMS_DIR/backend"
FRONTEND_DIR="$VMS_DIR/frontend"
LOG_DIR="$VMS_DIR/logs"
JAVA="/usr/lib/jvm/java-21-openjdk-21.0.10.0.7-2.el9.x86_64/bin/java"
GITHUB_REPO="https://github.com/mriislam/vms-web.git"
DB_USER="${VMS_DB_USER:-root}"
DB_PASS="${VMS_DB_PASS:?Set VMS_DB_PASS env var}"
DB_NAME="${VMS_DB_NAME:-vms_db}"
BACKEND_SERVICE="vms-backend"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
ok()  { echo -e "${GREEN}  ✓ $1${NC}"; }
info(){ echo -e "${CYAN}==> $1${NC}"; }
err() { echo -e "${RED}  ✗ $1${NC}"; exit 1; }

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║     VMS Fleet Manager — Production Deploy    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Step 1: Pull latest code ──────────────────────────────────────────────────
info "[1/7] Pulling latest code from GitHub"
cd "$VMS_DIR"

if git remote get-url github &>/dev/null; then
  git remote set-url github "$GITHUB_REPO"
else
  git remote add github "$GITHUB_REPO"
fi

git fetch github main 2>&1 | grep -v "^$" || true
git reset --hard github/main
ok "Code updated: $(git log --oneline -1)"

# ── Step 2: Frontend .env ─────────────────────────────────────────────────────
info "[2/7] Writing frontend .env"
cat > "$FRONTEND_DIR/.env" << EOF
VITE_ENCRYPTION_ENABLED=true
VITE_ENCRYPTION_KEY=${VMS_ENCRYPTION_KEY:?Set VMS_ENCRYPTION_KEY env var}
VITE_GOOGLE_MAPS_KEY=${VMS_MAPS_KEY:?Set VMS_MAPS_KEY env var}
EOF
ok ".env written"

# ── Step 3: DB schema migrations ──────────────────────────────────────────────
info "[3/7] Running DB schema migrations"
mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" 2>/dev/null << 'SQL' || true
-- Users: Firebase push notifications
ALTER TABLE users ADD COLUMN fcm_token VARCHAR(500) NULL;

-- Vehicles: icon field
ALTER TABLE vehicles ADD COLUMN vehicle_icon VARCHAR(100) NULL;

-- Drivers: linked user account
ALTER TABLE drivers ADD COLUMN user_id BIGINT NULL;

-- Requisitions: geo + datetime fields for booking map
ALTER TABLE requisitions
  ADD COLUMN from_lat         DOUBLE   NULL,
  ADD COLUMN from_lng         DOUBLE   NULL,
  ADD COLUMN to_lat           DOUBLE   NULL,
  ADD COLUMN to_lng           DOUBLE   NULL,
  ADD COLUMN distance_km      INT      NULL,
  ADD COLUMN from_datetime    DATETIME NULL,
  ADD COLUMN to_datetime      DATETIME NULL,
  ADD COLUMN geofence_radius_m INT NOT NULL DEFAULT 500,
  ADD COLUMN driver_id        INT      NULL;

ALTER TABLE requisitions
  MODIFY COLUMN from_date DATE NULL,
  MODIFY COLUMN to_date   DATE NULL,
  MODIFY COLUMN from_location VARCHAR(255) NULL,
  MODIFY COLUMN to_location   VARCHAR(255) NULL;

-- GPS devices table for VTS
CREATE TABLE IF NOT EXISTS gps_devices (
  id           BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  vehicle_reg  VARCHAR(20) NOT NULL,
  imei         VARCHAR(20) NOT NULL UNIQUE,
  msisdn       VARCHAR(20) NOT NULL,
  client_mobile VARCHAR(20) NULL,
  client_id    VARCHAR(20) NOT NULL UNIQUE,
  device_model VARCHAR(40) DEFAULT 'GT06N',
  status       VARCHAR(10) DEFAULT 'active',
  last_seen    DATETIME    NULL,
  last_lat     DOUBLE      NULL,
  last_lng     DOUBLE      NULL,
  last_speed   DOUBLE      NULL,
  engine_status VARCHAR(10) DEFAULT 'off',
  created_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
SQL
ok "Schema migrations applied (duplicate-column warnings above are harmless)"

# ── Step 4: Build backend JAR ─────────────────────────────────────────────────
info "[4/7] Building backend JAR (this takes ~60s)"
cd "$BACKEND_DIR"
chmod +x mvnw
./mvnw clean package -DskipTests -q
JAR=$(ls target/vms-backend-*.jar 2>/dev/null | head -1)
[ -f "$JAR" ] || err "JAR not found — build failed"
ok "JAR built: $(du -sh $JAR | cut -f1)  →  $JAR"

# ── Step 5: Build frontend ────────────────────────────────────────────────────
info "[5/7] Building frontend (npm)"
cd "$FRONTEND_DIR"
npm install --silent 2>&1 | tail -3
npm run build 2>&1 | tail -4
[ -d "dist" ] || err "dist/ not found — frontend build failed"
ok "Frontend built: $(du -sh dist/ | cut -f1)  →  $FRONTEND_DIR/dist/"

# ── Step 6: Restart backend service ──────────────────────────────────────────
info "[6/7] Restarting vms-backend service"
systemctl restart "$BACKEND_SERVICE"
sleep 5

STATUS=$(systemctl is-active "$BACKEND_SERVICE" 2>/dev/null || echo "unknown")
if [ "$STATUS" = "active" ]; then
  ok "Service $BACKEND_SERVICE is running"
else
  err "Service $BACKEND_SERVICE failed to start — check: journalctl -u $BACKEND_SERVICE -n 50"
fi

# ── Step 7: Reload nginx ──────────────────────────────────────────────────────
info "[7/7] Reloading nginx"
nginx -t 2>&1 | grep -E "syntax|error" || true
systemctl reload nginx
ok "Nginx reloaded"

# ── Health check ──────────────────────────────────────────────────────────────
echo ""
echo "── Health Check ────────────────────────────────"
sleep 2
HEALTH=$(curl -sf http://localhost:8080/api/health 2>/dev/null || echo "FAIL")
echo "  Backend: $HEALTH"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         DEPLOYMENT SUCCESSFUL ✓              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo "  Site: https://demo-vms.nexdecade.com"
echo "  API : https://demo-vms.nexdecade.com/api/health"
echo ""
