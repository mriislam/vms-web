#!/bin/bash
# =================================================================
#  VMS Fleet Manager — Initial Deployment on CentOS 9 Stream
#  Run as root: sudo bash deploy-init.sh
#  Edit the CONFIG section below before running.
# =================================================================
set -euo pipefail

# ── Colors ───────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "  ${GREEN}[OK]${NC}  $*"; }
fail() { echo -e "  ${RED}[!!]${NC}  $*" >&2; exit 1; }
info() { echo -e "  ${CYAN}...${NC}  $*"; }
warn() { echo -e "  ${YELLOW}[!]${NC}  $*"; }
hdr()  { echo -e "\n${BOLD}${BLUE}━━  $*  ━━${NC}"; }

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  CONFIG — edit these before running
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEPLOY_DIR="/opt/vms"
APP_USER="vms"
REPO_URL="https://mriislam@bitbucket.org/Nexdecade/vms-new-mri.git"
BRANCH="main"

MAVEN_VERSION="3.9.6"
MAVEN_HOME="/opt/apache-maven-${MAVEN_VERSION}"
NODE_VERSION="20"

DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="vms_db"
DB_USER="root"
DB_PASS="Kyhb8@6ZM8QN"        # MySQL root password

BACKEND_PORT="8443"
KEYSTORE_PASS="vms@Nexdecade2024"
UPLOAD_DIR="${DEPLOY_DIR}/uploads/notices"
LOG_DIR="${DEPLOY_DIR}/logs"
BACKEND_JAR="${DEPLOY_DIR}/backend/target/vms-backend-1.0.0.jar"

# Server hostname or IP — used in Nginx config and summary
SERVER_NAME=$(hostname -I | awk '{print $1}')
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[[ $EUID -ne 0 ]] && fail "Run this script as root:  sudo bash $0"

echo -e "\n${BOLD}${BLUE}  ==========================================${NC}"
echo -e "${BOLD}${BLUE}   VMS Fleet Manager — CentOS 9 Deployment  ${NC}"
echo -e "${BOLD}${BLUE}  ==========================================${NC}\n"

# ── 1. System update ─────────────────────────────────────────────
hdr "1. System Update"
info "Updating packages..."
dnf update -y -q 2>&1 | tail -2
dnf install -y -q curl wget git tar unzip 2>&1 | tail -2
ok "System ready"

# ── 2. Java 21 ───────────────────────────────────────────────────
hdr "2. Java 21 OpenJDK"
if java -version 2>&1 | grep -q '"21\.'; then
    ok "Java 21 already installed"
else
    info "Installing Java 21..."
    dnf install -y java-21-openjdk java-21-openjdk-devel
fi
JAVA_HOME_PATH=$(dirname $(dirname $(readlink -f $(which java))))
ok "JAVA_HOME = ${JAVA_HOME_PATH}"
ok "$(java -version 2>&1 | head -1)"

# ── 3. Maven ─────────────────────────────────────────────────────
hdr "3. Apache Maven ${MAVEN_VERSION}"
if [[ -x "${MAVEN_HOME}/bin/mvn" ]]; then
    ok "Maven already at ${MAVEN_HOME}"
else
    info "Downloading Maven ${MAVEN_VERSION}..."
    MAVEN_URL="https://downloads.apache.org/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz"
    curl -fsSL "$MAVEN_URL" -o /tmp/maven.tar.gz
    tar -xzf /tmp/maven.tar.gz -C /opt/
    rm /tmp/maven.tar.gz
    ok "Maven installed at ${MAVEN_HOME}"
fi
ln -sf "${MAVEN_HOME}/bin/mvn" /usr/local/bin/mvn 2>/dev/null || true
export PATH="${MAVEN_HOME}/bin:${JAVA_HOME_PATH}/bin:$PATH"
ok "$(mvn -v | head -1)"

# ── 4. Node.js ───────────────────────────────────────────────────
hdr "4. Node.js ${NODE_VERSION}"
if node --version 2>/dev/null | grep -q "^v${NODE_VERSION}"; then
    ok "Node.js $(node --version) already installed"
else
    info "Installing Node.js ${NODE_VERSION} via NodeSource..."
    curl -fsSL "https://rpm.nodesource.com/setup_${NODE_VERSION}.x" | bash - 2>&1 | tail -3
    dnf install -y nodejs
    ok "Node.js $(node --version), npm $(npm --version)"
fi

# ── 5. MySQL 8.0 ─────────────────────────────────────────────────
hdr "5. MySQL 8.0"
if systemctl is-active --quiet mysqld 2>/dev/null; then
    ok "MySQL already running"
else
    if ! rpm -q mysql-community-server &>/dev/null; then
        info "Adding MySQL 8.0 repository..."
        dnf install -y "https://dev.mysql.com/get/mysql80-community-release-el9-5.noarch.rpm" 2>&1 | tail -2
        rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2023
        info "Installing MySQL community server..."
        dnf install -y mysql-community-server 2>&1 | tail -3
    fi
    info "Starting MySQL..."
    systemctl enable --now mysqld

    # Grab temporary root password from log and change it
    sleep 2
    TEMP_PASS=$(grep 'temporary password' /var/log/mysqld.log 2>/dev/null | awk '{print $NF}' | tail -1)
    if [[ -n "$TEMP_PASS" ]]; then
        info "Setting MySQL root password..."
        mysql --connect-expired-password -uroot -p"${TEMP_PASS}" \
            -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '${DB_PASS}'; FLUSH PRIVILEGES;" 2>/dev/null \
            && ok "MySQL root password set" \
            || warn "Could not set MySQL password — it may already be configured"
    fi
    ok "MySQL running"
fi

# ── 6. Nginx ─────────────────────────────────────────────────────
hdr "6. Nginx"
if ! rpm -q nginx &>/dev/null; then
    info "Installing Nginx..."
    dnf install -y nginx
fi
systemctl enable nginx
ok "Nginx installed"

# ── 7. App user ──────────────────────────────────────────────────
hdr "7. App User"
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -s /bin/bash -m -d "$DEPLOY_DIR" "$APP_USER"
    ok "System user '${APP_USER}' created"
else
    ok "User '${APP_USER}' already exists"
fi

# ── 8. Clone repository ──────────────────────────────────────────
hdr "8. Repository"
if [[ -d "${DEPLOY_DIR}/.git" ]]; then
    warn "Repo already exists at ${DEPLOY_DIR} — pulling latest..."
    git -C "$DEPLOY_DIR" pull origin "$BRANCH"
    ok "Repository updated"
else
    info "Cloning from Bitbucket (enter your app password when prompted)..."
    git clone --branch "$BRANCH" "$REPO_URL" "$DEPLOY_DIR"
    ok "Repository cloned to ${DEPLOY_DIR}"
fi
chown -R "${APP_USER}:${APP_USER}" "$DEPLOY_DIR"

# ── 9. Configure application.properties for Linux ────────────────
hdr "9. Backend Configuration"
APP_PROPS="${DEPLOY_DIR}/backend/src/main/resources/application.properties"
mkdir -p "${UPLOAD_DIR}" "${LOG_DIR}"
chown -R "${APP_USER}:${APP_USER}" "${UPLOAD_DIR}" "${LOG_DIR}"

# Replace Windows paths with Linux paths
sed -i "s|file:D:/VMS/backend/src/main/resources/|file:${DEPLOY_DIR}/backend/src/main/resources/|g" "$APP_PROPS"
sed -i "s|D:/VMS/uploads/notices|${UPLOAD_DIR}|g" "$APP_PROPS"
ok "application.properties updated for Linux paths"

# ── 10. MySQL database setup ─────────────────────────────────────
hdr "10. Database"
if mysql -u"${DB_USER}" -p"${DB_PASS}" -e "USE ${DB_NAME};" 2>/dev/null; then
    ok "Database '${DB_NAME}' exists"
else
    info "Creating database '${DB_NAME}'..."
    mysql -u"${DB_USER}" -p"${DB_PASS}" -e \
        "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" \
        && ok "Database '${DB_NAME}' created" \
        || fail "Could not create database — check DB_USER / DB_PASS in this script"
fi

TABLE_COUNT=$(mysql -u"${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" \
    -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';" -sN 2>/dev/null || echo 0)

if [[ "$TABLE_COUNT" -eq 0 ]]; then
    info "Importing schema..."
    [[ -f "${DEPLOY_DIR}/vms_schema.sql" ]] && \
        mysql -u"${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" < "${DEPLOY_DIR}/vms_schema.sql" \
        && ok "Schema imported (vms_schema.sql)"

    [[ -f "${DEPLOY_DIR}/sample_data.sql" ]] && \
        mysql -u"${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" < "${DEPLOY_DIR}/sample_data.sql" \
        && ok "Sample data imported (sample_data.sql)"
else
    ok "Database has ${TABLE_COUNT} tables — skipping schema import"
fi

# ── 11. Build backend ────────────────────────────────────────────
hdr "11. Build Backend"
info "Running: mvn clean package -DskipTests  (~60 seconds)..."
sudo -u "$APP_USER" bash -c "
    export JAVA_HOME='${JAVA_HOME_PATH}'
    export PATH='${MAVEN_HOME}/bin:${JAVA_HOME_PATH}/bin:\$PATH'
    cd '${DEPLOY_DIR}/backend'
    mvn clean package -DskipTests 2>&1 | tee -a '${LOG_DIR}/build.log' | tail -6
"
[[ -f "$BACKEND_JAR" ]] && ok "JAR ready: ${BACKEND_JAR}" || fail "Maven build failed — check ${LOG_DIR}/build.log"

# ── 12. Systemd service ──────────────────────────────────────────
hdr "12. Systemd Service"
cat > /etc/systemd/system/vms-backend.service <<EOF
[Unit]
Description=VMS Fleet Manager — Spring Boot Backend
After=network.target mysqld.service
Requires=mysqld.service

[Service]
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${DEPLOY_DIR}/backend
ExecStart=${JAVA_HOME_PATH}/bin/java -jar ${BACKEND_JAR}
SuccessExitStatus=143
Restart=on-failure
RestartSec=10
StandardOutput=append:${LOG_DIR}/backend.log
StandardError=append:${LOG_DIR}/backend.log
Environment="JAVA_HOME=${JAVA_HOME_PATH}"
Environment="PATH=${MAVEN_HOME}/bin:${JAVA_HOME_PATH}/bin:/usr/local/bin:/usr/bin:/bin"

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable vms-backend
ok "vms-backend.service registered"

# ── 13. Build frontend ───────────────────────────────────────────
hdr "13. Build Frontend"
FRONTEND_DIR="${DEPLOY_DIR}/frontend"
info "Installing npm packages..."
sudo -u "$APP_USER" npm install --prefix "$FRONTEND_DIR" --silent 2>&1 | tail -2
info "Building production bundle..."
sudo -u "$APP_USER" npm run build --prefix "$FRONTEND_DIR" 2>&1 | tail -5
DIST_DIR="${FRONTEND_DIR}/dist"
[[ -d "$DIST_DIR" ]] && ok "Frontend bundle ready at ${DIST_DIR}" || fail "Frontend build failed"
chown -R "${APP_USER}:${APP_USER}" "$DIST_DIR"

# ── 14. Nginx configuration ──────────────────────────────────────
hdr "14. Nginx"
# Remove default site if present
rm -f /etc/nginx/conf.d/default.conf

cat > /etc/nginx/conf.d/vms.conf <<NGINX
server {
    listen 80;
    server_name ${SERVER_NAME};

    # Frontend — React SPA static files
    root ${DIST_DIR};
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API proxy → Spring Boot backend (HTTPS, self-signed cert)
    location /api/ {
        proxy_pass          https://127.0.0.1:${BACKEND_PORT};
        proxy_ssl_verify    off;
        proxy_http_version  1.1;
        proxy_set_header    Host              \$host;
        proxy_set_header    X-Real-IP         \$remote_addr;
        proxy_set_header    X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 30s;
        proxy_read_timeout    60s;
        client_max_body_size  25M;
    }

    # File uploads served directly
    location /uploads/ {
        alias ${UPLOAD_DIR}/;
    }

    access_log /var/log/nginx/vms-access.log;
    error_log  /var/log/nginx/vms-error.log;
}
NGINX

nginx -t 2>&1 && ok "Nginx config valid" || fail "Nginx config has errors — check /etc/nginx/conf.d/vms.conf"

# ── 15. Firewall ─────────────────────────────────────────────────
hdr "15. Firewall (firewalld)"
if systemctl is-active --quiet firewalld; then
    firewall-cmd --permanent --add-service=http   --quiet 2>/dev/null || true
    firewall-cmd --permanent --add-service=https  --quiet 2>/dev/null || true
    firewall-cmd --permanent --add-port=8443/tcp  --quiet 2>/dev/null || true
    firewall-cmd --reload --quiet
    ok "Ports opened: 80, 443, 8443"
else
    warn "firewalld not running — skipping (open ports 80, 443, 8443 manually if needed)"
fi

# ── 16. SELinux ──────────────────────────────────────────────────
hdr "16. SELinux"
if command -v getenforce &>/dev/null && [[ "$(getenforce)" == "Enforcing" ]]; then
    setsebool -P httpd_can_network_connect 1
    setsebool -P httpd_can_network_relay   1
    ok "SELinux: Nginx → backend network connect allowed"
else
    ok "SELinux not enforcing — skipping"
fi

# ── 17. Start services ───────────────────────────────────────────
hdr "17. Start Services"
systemctl restart vms-backend
info "Waiting for backend to start (up to 3 min)..."
TIMEOUT=180; ELAPSED=0; STARTED=false
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
    ok "Backend running on https://${SERVER_NAME}:${BACKEND_PORT}"
else
    warn "Backend health check timed out — check logs: tail -50 ${LOG_DIR}/backend.log"
fi

systemctl restart nginx && ok "Nginx running on http://${SERVER_NAME}"

# Copy this and the update script to the deploy dir for easy access
cp "$(realpath "$0")"                 "${DEPLOY_DIR}/scripts/deploy-init.sh"    2>/dev/null || true
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
[[ -f "${SCRIPT_DIR}/deploy-update.sh" ]] && \
    cp "${SCRIPT_DIR}/deploy-update.sh" "${DEPLOY_DIR}/scripts/deploy-update.sh" 2>/dev/null || true
chown -R "${APP_USER}:${APP_USER}" "${DEPLOY_DIR}/scripts" 2>/dev/null || true

# ── Summary ──────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}  ==========================================${NC}"
echo -e "${BOLD}${GREEN}   VMS IS DEPLOYED                         ${NC}"
echo -e "${BOLD}${GREEN}   Frontend  →  http://${SERVER_NAME}      ${NC}"
echo -e "${BOLD}${GREEN}   Backend   →  https://${SERVER_NAME}:${BACKEND_PORT}${NC}"
echo -e "${BOLD}${GREEN}   Logs      →  ${LOG_DIR}/                ${NC}"
echo -e "${BOLD}${GREEN}  ==========================================${NC}"
echo ""
echo -e "  Useful commands:"
echo -e "  ${CYAN}sudo systemctl status  vms-backend${NC}      — service status"
echo -e "  ${CYAN}sudo systemctl restart vms-backend${NC}      — restart backend"
echo -e "  ${CYAN}sudo tail -f ${LOG_DIR}/backend.log${NC}     — live backend log"
echo -e "  ${CYAN}sudo tail -f /var/log/nginx/vms-error.log${NC} — Nginx errors"
echo -e "  ${CYAN}sudo bash ${DEPLOY_DIR}/scripts/deploy-update.sh${NC} — deploy updates"
echo ""
