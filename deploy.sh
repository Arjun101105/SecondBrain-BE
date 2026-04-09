#!/bin/bash

###############################################################################
# SecondBrain Backend — EC2 Deployment Script
# Purpose: Automated setup of TypeScript API with PM2, Nginx, and Let's Encrypt
# Usage: sudo bash deploy.sh
# Requirements: Fresh Ubuntu 22.04+ LTS instance
#
# What this does:
#   1. Installs Node.js 22, PM2, Nginx, Certbot
#   2. Clones the repo and builds TypeScript → dist/
#   3. Starts the API via PM2 in cluster mode
#   4. Configures Nginx as reverse proxy with gzip + rate limiting
#   5. Provisions Let's Encrypt SSL + auto-renewal
#   6. Verifies everything works
#
# BEFORE RUNNING:
#   - Point your domain's DNS A record to this server's IP
#   - Place your .env file at /tmp/.env or /root/.env or current dir
#   - Required env vars: MONGO_URI, JWT_SECRET
###############################################################################

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────
REPO_URL="${REPO_URL:-https://github.com/Arjun101105/SecondBrain-BE.git}"
APP_PATH="/opt/secondbrain-api"
APP_NAME="secondbrain-api"
DOMAIN="${DOMAIN:-api.secondbrain.arjun10.tech}"
NODE_VERSION="22"
APP_PORT="5000"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@arjun10.tech}"

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Utility Functions ──────────────────────────────────────────────────────

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[⚠]${NC} $1"; }
log_error()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }
log_phase()   { echo ""; echo -e "${CYAN}${BOLD}━━━ $1 ━━━${NC}"; }

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root. Use: sudo bash deploy.sh"
    fi
}

# ─── Locate .env file from common locations ─────────────────────────────────
find_env_file() {
    log_info "Searching for .env file..."

    local search_paths=("$APP_PATH/.env" "./.env" "/tmp/.env" "/root/.env" "$HOME/.env")

    for path in "${search_paths[@]}"; do
        if [[ -f "$path" ]]; then
            log_info "Found .env at $path"
            mkdir -p "$APP_PATH"
            if [[ "$path" != "$APP_PATH/.env" ]]; then
                cp "$path" "$APP_PATH/.env"
            fi
            chown root:root "$APP_PATH/.env"
            chmod 600 "$APP_PATH/.env"
            log_success ".env staged at $APP_PATH/.env"
            return 0
        fi
    done

    log_error ".env not found. Place it at /tmp/.env, /root/.env, or current directory before running."
}

###############################################################################
# PHASE 1: System Dependencies
###############################################################################

install_system_deps() {
    log_phase "PHASE 1: System Dependencies"

    log_info "Updating system packages..."
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

    log_info "Installing base packages..."
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
        curl wget git build-essential python3 \
        certbot python3-certbot-nginx \
        apt-transport-https ca-certificates gnupg lsb-release \
        nginx ufw fail2ban \
        > /dev/null 2>&1

    log_success "System packages installed"
}

install_nodejs() {
    log_info "Installing Node.js ${NODE_VERSION}.x..."

    # Remove old Node if present
    apt-get remove -y nodejs npm 2>/dev/null || true

    # NodeSource repo
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash - > /dev/null 2>&1
    apt-get install -y nodejs -qq > /dev/null 2>&1

    log_success "Node.js $(node --version) installed"
    log_success "npm $(npm --version) installed"
}

install_pm2() {
    log_info "Installing PM2 process manager..."
    npm install -g pm2@latest > /dev/null 2>&1
    pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true
    log_success "PM2 installed and startup hook configured"
}

###############################################################################
# PHASE 2: Project Setup
###############################################################################

setup_project() {
    log_phase "PHASE 2: Project Setup"

    if [[ ! -d "$APP_PATH/.git" ]]; then
        log_info "Cloning repository..."
        rm -rf "$APP_PATH"
        git clone "$REPO_URL" "$APP_PATH"
    else
        log_info "Updating existing repository..."
        cd "$APP_PATH"
        git fetch origin
        git reset --hard origin/main || git reset --hard origin/master
    fi

    cd "$APP_PATH"

    # Since the backend is in the backend/ subfolder of the repo
    if [[ -d "backend" ]]; then
        log_info "Detected monorepo structure — using backend/ subfolder"
        # Copy backend files to app root for deployment
        # We work within backend/ as the deployment target
        APP_PATH="$APP_PATH/backend"
        cd "$APP_PATH"
    fi

    log_success "Project cloned at $APP_PATH"
}

install_dependencies() {
    log_info "Installing Node.js dependencies (production)..."
    cd "$APP_PATH"

    # Install all deps (need devDeps for TypeScript build)
    npm ci --ignore-scripts > /dev/null 2>&1 || npm install > /dev/null 2>&1

    log_success "Dependencies installed"
}

build_typescript() {
    log_info "Building TypeScript → dist/..."
    cd "$APP_PATH"

    # Clean old build
    rm -rf dist/

    # Build
    npx tsc

    if [[ ! -f "dist/server.js" ]]; then
        log_error "Build failed — dist/server.js not found"
    fi

    log_success "TypeScript compiled to dist/"
}

validate_env() {
    log_info "Validating environment configuration..."

    # Copy the staged .env into the deployment directory
    local staged_env="/opt/secondbrain-api/.env"
    if [[ -f "$staged_env" && "$staged_env" != "$APP_PATH/.env" ]]; then
        cp "$staged_env" "$APP_PATH/.env"
    fi

    local env_file="$APP_PATH/.env"

    if [[ ! -f "$env_file" ]]; then
        log_error ".env file missing at $env_file"
    fi

    # Check required vars
    grep -q "MONGO_URI=" "$env_file"  || log_error "MONGO_URI not found in .env"
    grep -q "JWT_SECRET=" "$env_file" || log_error "JWT_SECRET not found in .env"

    # Ensure production defaults
    grep -q "NODE_ENV=" "$env_file" || echo "NODE_ENV=production" >> "$env_file"
    sed -i 's/NODE_ENV=.*/NODE_ENV=production/' "$env_file"

    grep -q "PORT=" "$env_file" || echo "PORT=${APP_PORT}" >> "$env_file"

    log_success "Environment validated"
}

###############################################################################
# PHASE 3: PM2 Process Manager
###############################################################################

create_pm2_config() {
    log_phase "PHASE 3: PM2 Configuration"

    log_info "Creating PM2 ecosystem file..."

    cat > "$APP_PATH/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: '${APP_NAME}',
    script: './dist/server.js',
    cwd: '${APP_PATH}',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: ${APP_PORT}
    },
    // Logging
    merge_logs: true,
    error_file: '/var/log/pm2/${APP_NAME}-error.log',
    out_file: '/var/log/pm2/${APP_NAME}-out.log',
    log_file: '/var/log/pm2/${APP_NAME}.log',
    time: true,
    // Reliability
    watch: false,
    max_memory_restart: '512M',
    autorestart: true,
    max_restarts: 15,
    min_uptime: '10s',
    listen_timeout: 5000,
    kill_timeout: 5000,
    // Graceful
    shutdown_with_message: true,
    wait_ready: false,
    ignore_watch: ['node_modules', '.git', 'logs', 'dist'],
  }]
};
EOF

    log_success "PM2 ecosystem config created"
}

start_pm2() {
    log_info "Starting application with PM2..."
    cd "$APP_PATH"

    # Create log directory
    mkdir -p /var/log/pm2

    # Stop any existing instance
    pm2 delete "$APP_NAME" 2>/dev/null || true
    sleep 1

    # Start
    pm2 start ecosystem.config.js --env production
    pm2 save

    # Wait and verify
    sleep 4

    if pm2 list | grep -q "$APP_NAME"; then
        local instances
        instances=$(pm2 jlist 2>/dev/null | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")
        log_success "PM2 running with $instances instance(s)"
    else
        log_error "PM2 failed to start the application"
    fi
}

###############################################################################
# PHASE 4: Firewall
###############################################################################

setup_firewall() {
    log_phase "PHASE 4: Firewall & Security"

    log_info "Configuring UFW firewall..."
    ufw default deny incoming > /dev/null 2>&1
    ufw default allow outgoing > /dev/null 2>&1
    ufw allow ssh > /dev/null 2>&1
    ufw allow 'Nginx Full' > /dev/null 2>&1

    # Don't expose the raw Node port to the internet
    # Only Nginx on 80/443 can reach it via localhost

    echo "y" | ufw enable > /dev/null 2>&1
    log_success "Firewall enabled (SSH + HTTP/HTTPS only)"

    log_info "Enabling fail2ban..."
    systemctl enable fail2ban > /dev/null 2>&1
    systemctl start fail2ban > /dev/null 2>&1
    log_success "fail2ban active (SSH brute-force protection)"
}

###############################################################################
# PHASE 5: Nginx
###############################################################################

configure_nginx() {
    log_phase "PHASE 5: Nginx Reverse Proxy"

    log_info "Creating rate-limiting zone..."
    mkdir -p /etc/nginx/conf.d
    cat > /etc/nginx/conf.d/rate-limiting.conf << 'EOF'
# Rate limiting: 100 requests/second per IP
limit_req_zone $binary_remote_addr zone=api_rate:10m rate=100r/s;
EOF

    log_info "Creating Nginx site config..."
    cat > "/etc/nginx/sites-available/${APP_NAME}" << NGINXEOF
# ─── Upstream (PM2 cluster) ──────────────────────────────────────
upstream secondbrain_upstream {
    least_conn;
    server 127.0.0.1:${APP_PORT};
}

# ─── HTTP → HTTPS redirect ──────────────────────────────────────
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# ─── HTTPS server ───────────────────────────────────────────────
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    # SSL (certbot will update these paths)
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    # Modern TLS config
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;

    # Rate limiting
    limit_req zone=api_rate burst=200 nodelay;

    # Timeouts
    client_body_timeout 30s;
    client_header_timeout 30s;
    keepalive_timeout 65s;
    send_timeout 30s;

    # Max upload size (for file uploads)
    client_max_body_size 50M;

    # API proxy
    location / {
        proxy_pass http://secondbrain_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check (no access log noise)
    location /health {
        access_log off;
        proxy_pass http://secondbrain_upstream;
        proxy_set_header Host \$host;
    }

    # Block dotfiles
    location ~ /\\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
NGINXEOF

    # Enable site
    ln -sf "/etc/nginx/sites-available/${APP_NAME}" "/etc/nginx/sites-enabled/${APP_NAME}"
    rm -f /etc/nginx/sites-enabled/default

    log_success "Nginx configuration created"
}

###############################################################################
# PHASE 6: SSL Certificate
###############################################################################

provision_ssl() {
    log_phase "PHASE 6: SSL Certificate"

    log_info "Stopping Nginx for standalone certificate provisioning..."
    systemctl stop nginx
    sleep 2

    log_info "Requesting Let's Encrypt certificate for ${DOMAIN}..."
    mkdir -p /var/www/certbot

    certbot certonly --standalone \
        -d "$DOMAIN" \
        --email "$ADMIN_EMAIL" \
        --agree-tos \
        --non-interactive \
        || log_error "SSL provisioning failed — ensure DNS A record points to this server"

    if [[ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
        log_error "SSL certificate not found after provisioning"
    fi

    log_success "SSL certificate provisioned"

    # Start Nginx with SSL
    if nginx -t 2>/dev/null; then
        systemctl start nginx
        systemctl enable nginx
        log_success "Nginx started with HTTPS"
    else
        log_error "Nginx config test failed — check /etc/nginx/sites-available/${APP_NAME}"
    fi

    # Auto-renewal hook
    log_info "Setting up auto-renewal..."
    mkdir -p /etc/letsencrypt/renewal-hooks/post
    cat > /etc/letsencrypt/renewal-hooks/post/nginx-reload.sh << 'EOF'
#!/bin/bash
systemctl reload nginx
EOF
    chmod +x /etc/letsencrypt/renewal-hooks/post/nginx-reload.sh
    systemctl enable certbot.timer 2>/dev/null || true
    systemctl start certbot.timer 2>/dev/null || true

    log_success "SSL auto-renewal configured"
}

###############################################################################
# PHASE 7: Verification
###############################################################################

verify_deployment() {
    log_phase "PHASE 7: Verification"

    local passed=0
    local total=5

    # Node.js
    if command -v node &>/dev/null; then
        log_success "Node.js $(node --version)"
        ((passed++))
    else
        log_warning "Node.js not found"
    fi

    # PM2
    if pm2 list 2>/dev/null | grep -q "$APP_NAME"; then
        log_success "PM2 app '${APP_NAME}' running"
        ((passed++))
    else
        log_warning "PM2 app not running"
    fi

    # Nginx
    if systemctl is-active --quiet nginx; then
        log_success "Nginx active"
        ((passed++))
    else
        log_warning "Nginx not running"
    fi

    # Port listening
    if ss -tuln 2>/dev/null | grep -q ":${APP_PORT}"; then
        log_success "Port ${APP_PORT} listening"
        ((passed++))
    else
        log_warning "Port ${APP_PORT} not listening"
    fi

    # Health check
    sleep 2
    if curl -sf "http://localhost:${APP_PORT}/health" | grep -q "success" 2>/dev/null; then
        log_success "Health endpoint responding"
        ((passed++))
    else
        log_warning "Health endpoint not responding yet (may still be starting)"
    fi

    echo ""
    log_info "Checks passed: ${passed}/${total}"
}

###############################################################################
# Summary
###############################################################################

display_summary() {
    local instances
    instances=$(pm2 jlist 2>/dev/null | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")

    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}         ${BOLD}SECONDBRAIN BACKEND — DEPLOYED ✓${NC}               ${CYAN}║${NC}"
    echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  App Name:       ${BOLD}${APP_NAME}${NC}"
    echo -e "${CYAN}║${NC}  App Path:       ${APP_PATH}"
    echo -e "${CYAN}║${NC}  Node Port:      ${APP_PORT} (Nginx → 80/443)"
    echo -e "${CYAN}║${NC}  Domain:         ${BOLD}https://${DOMAIN}${NC}"
    echo -e "${CYAN}║${NC}  PM2 Instances:  ${instances}"
    echo -e "${CYAN}║${NC}  Nginx:          $(systemctl is-active nginx 2>/dev/null)"
    echo -e "${CYAN}║${NC}  SSL:            Let's Encrypt (auto-renew)"
    echo -e "${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${BOLD}NEXT STEPS:${NC}"
    echo -e "${CYAN}║${NC}  1. DNS check:   nslookup ${DOMAIN}"
    echo -e "${CYAN}║${NC}  2. Test HTTPS:  curl https://${DOMAIN}/health"
    echo -e "${CYAN}║${NC}  3. View logs:   pm2 logs ${APP_NAME}"
    echo -e "${CYAN}║${NC}  4. Monitor:     pm2 monit"
    echo -e "${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${BOLD}USEFUL COMMANDS:${NC}"
    echo -e "${CYAN}║${NC}  • pm2 status                   — Process list"
    echo -e "${CYAN}║${NC}  • pm2 logs ${APP_NAME}      — Stream logs"
    echo -e "${CYAN}║${NC}  • pm2 restart ${APP_NAME}   — Restart app"
    echo -e "${CYAN}║${NC}  • pm2 reload ${APP_NAME}    — Zero-downtime reload"
    echo -e "${CYAN}║${NC}  • systemctl status nginx       — Nginx status"
    echo -e "${CYAN}║${NC}  • certbot certificates         — SSL info"
    echo -e "${CYAN}║${NC}  • bash ${APP_PATH}/deploy.sh   — Re-run deployment"
    echo -e "${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

###############################################################################
# Main
###############################################################################

main() {
    echo ""
    echo -e "${CYAN}${BOLD}🧠 SecondBrain Backend Deployment${NC}"
    echo -e "${CYAN}───────────────────────────────────${NC}"
    echo ""

    check_root

    # Phase 1: System
    install_system_deps
    install_nodejs
    install_pm2

    # Phase 2: Project
    find_env_file
    setup_project
    validate_env
    install_dependencies
    build_typescript

    # Phase 3: PM2
    create_pm2_config
    start_pm2

    # Phase 4: Firewall
    setup_firewall

    # Phase 5: Nginx
    configure_nginx

    # Phase 6: SSL
    provision_ssl

    # Phase 7: Verify
    verify_deployment

    # Done
    display_summary
    log_success "Deployment completed successfully! 🚀"
}

main "$@"
