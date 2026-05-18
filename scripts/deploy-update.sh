#!/bin/bash
# =================================================================
#  VMS Fleet Manager — Update Deployment on CentOS 9
#  Pulls latest code, rebuilds backend + frontend, restarts services
#  Run as root: sudo bash deploy-update.sh
# =================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "  ${GREEN}[OK]${NC}  $*"; }
fail() { echo -e "  ${RED}[!!]${NC}  $*" >&2; exit 1; }
info() { echo -e "  ${CYAN}...${NC}  $*"; }
warn() { echo -e "  ${YELLOW}[!]${NC}  $*"; }
hdr()  { echo -e "\n${BOLD}${BLUE}━━  $*  ━━${NC}"; }

[[ $EUID -ne 0 ]] && fail "Run as root:  sudo bash $0"

# ── Settings (must match deploy-init.sh) ─────────────────────────
DEPLOY_DIR="/opt/vms"
APP_USER="vms"
BRANCH="main"
MAVEN_HOME="/opt/apache-maven-3.9.6"
LOG_DIR="${DEPLOY_DIR}/logs"
BACKEND_JAR="${DEPLOY_DIR}/backend/target/vms-backend-1.0.0.jar"
FRONTEND_DIR="${DEPLOY_DIR}/frontend"
JAVA_HOME_PATH=$(dirname $(dirname $(readlink -f $(which java))))
export PATH="${MAVEN_HOME}/bin:${JAVA_HOME_PATH}/bin:$PATH"

echo -e "\n${BOLD}${BLUE}  VMS Fleet Manager — Update Deployment${NC}\n"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"

# ── 1. Pull latest code ──────────────────────────────────────────
hdr "1. Pull Latest Code"
git -C "$DEPLOY_DIR" fetch origin "$BRANCH"
LOCAL=$(git -C "$DEPLOY_DIR" rev-parse HEAD)
REMOTE=$(git -C "$DEPLOY_DIR" rev-parse "origin/${BRANCH}")

if [[ "$LOCAL" == "$REMOTE" ]]; then
    ok "Already up-to-date ($(git -C "$DEPLOY_DIR" log -1 --format='%h %s'))"
else
    info "Pulling changes..."
    git -C "$DEPLOY_DIR" pull origin "$BRANCH"
    ok "Updated to $(git -C "$DEPLOY_DIR" log -1 --format='%h %s')"
fi
chown -R "${APP_USER}:${APP_USER}" "$DEPLOY_DIR"

# ── 2. Rebuild backend ───────────────────────────────────────────
hdr "2. Rebuild Backend"
info "Running: mvn clean package -DskipTests  (~60 seconds)..."
sudo -u "$APP_USER" env \
    JAVA_HOME="${JAVA_HOME_PATH}" \
    PATH="${MAVEN_HOME}/bin:${JAVA_HOME_PATH}/bin:/usr/local/bin:/usr/bin:/bin" \
    HOME="${DEPLOY_DIR}" \
    bash -c "cd '${DEPLOY_DIR}/backend' && mvn clean package -DskipTests" \
    2>&1 | /usr/bin/tee -a "${LOG_DIR}/build.log" | /usr/bin/tail -8
[[ -f "$BACKEND_JAR" ]] && ok "JAR rebuilt: ${BACKEND_JAR}" || fail "Build failed — check ${LOG_DIR}/build.log"

# ── 3. Rebuild frontend ──────────────────────────────────────────
hdr "3. Rebuild Frontend"
info "Installing packages (if changed)..."
sudo -u "$APP_USER" npm install --prefix "$FRONTEND_DIR" --silent 2>&1 | tail -2
info "Building production bundle..."
sudo -u "$APP_USER" npm run build --prefix "$FRONTEND_DIR" 2>&1 | tail -5
DIST_DIR="${FRONTEND_DIR}/dist"
[[ -d "$DIST_DIR" ]] && ok "Frontend bundle ready" || fail "Frontend build failed"
chown -R "${APP_USER}:${APP_USER}" "$DIST_DIR"

# ── 4. Restart services ──────────────────────────────────────────
hdr "4. Restart Services"
info "Restarting vms-backend..."
systemctl restart vms-backend

info "Waiting for backend to start..."
TIMEOUT=180; ELAPSED=0; STARTED=false

# Clear previous startup marker from log before waiting
truncate -s 0 "${LOG_DIR}/backend.log" 2>/dev/null || true
sleep 3

while [[ $ELAPSED -lt $TIMEOUT ]]; do
    sleep 5; ELAPSED=$((ELAPSED + 5))
    if grep -q "Started VmsApplication" "${LOG_DIR}/backend.log" 2>/dev/null; then
        STARTED=true; break
    fi
    if grep -q "BUILD FAILURE\|APPLICATION FAILED\|Unable to start" "${LOG_DIR}/backend.log" 2>/dev/null; then
        break
    fi
    echo -ne "  ... ${ELAPSED}s\r"
done

if $STARTED; then
    ok "Backend started (${ELAPSED}s)"
else
    warn "Backend did not start within ${TIMEOUT}s — check: tail -50 ${LOG_DIR}/backend.log"
fi

systemctl reload nginx && ok "Nginx reloaded"

# ── Summary ──────────────────────────────────────────────────────
echo ""
SERVER_NAME=$(hostname -I | awk '{print $1}')
echo -e "${BOLD}${GREEN}  ==========================================${NC}"
echo -e "${BOLD}${GREEN}   UPDATE COMPLETE                         ${NC}"
echo -e "${BOLD}${GREEN}   Commit: $(git -C "$DEPLOY_DIR" log -1 --format='%h %s' 2>/dev/null || echo 'n/a')${NC}"
echo -e "${BOLD}${GREEN}  ==========================================${NC}"
echo ""
echo -e "  ${CYAN}sudo tail -f ${LOG_DIR}/backend.log${NC}  — live log"
echo -e "  ${CYAN}sudo systemctl status vms-backend${NC}  — service status"
echo ""
