#!/bin/bash
set -euo pipefail

# ─── Config ───
VPS_HOST="server1-purity-pharm"
DEPLOY_DIR="/opt/silk-road-pipeline"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Silk Road Pipeline — Deploy to VPS ==="
echo "Source: $PROJECT_DIR"
echo "Target: $VPS_HOST:$DEPLOY_DIR"
echo ""

# Step 1: Check VPS connectivity
echo "→ Checking VPS connectivity..."
ssh "$VPS_HOST" "hostname && docker --version && docker compose version" || {
  echo "ERROR: Cannot connect to $VPS_HOST or Docker is not installed."
  exit 1
}

# Step 2: Create deploy directory on VPS
echo "→ Creating deploy directory..."
ssh "$VPS_HOST" "mkdir -p $DEPLOY_DIR"

# Step 3: Rsync project files (exclude dev stuff)
echo "→ Syncing project files..."
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.production' \
  --exclude='supabase/.branches' \
  --exclude='supabase/.temp' \
  "$PROJECT_DIR/" "$VPS_HOST:$DEPLOY_DIR/"

# Step 4: Generate secrets if .env.production does not exist
echo "→ Checking environment..."
ssh "$VPS_HOST" bash << 'REMOTE_SCRIPT'
cd /opt/silk-road-pipeline

if [ ! -f .env.production ]; then
  echo "  → Generating secrets..."
  JWT_SECRET=$(openssl rand -hex 32)
  POSTGRES_PASSWORD=$(openssl rand -hex 16)
  SECRET_KEY_BASE=$(openssl rand -hex 64)

  # Generate JWT tokens for anon and service_role
  # Using pure bash + openssl (no node dependency)
  jwt_encode() {
    local role="$1"
    local header=$(echo -n '{"alg":"HS256","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
    local now=$(date +%s)
    local exp=$((now + 315360000))
    local payload=$(echo -n "{\"role\":\"$role\",\"iss\":\"supabase\",\"iat\":$now,\"exp\":$exp}" | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
    local signature=$(echo -n "$header.$payload" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
    echo "$header.$payload.$signature"
  }

  ANON_KEY=$(jwt_encode "anon")
  SERVICE_ROLE_KEY=$(jwt_encode "service_role")

  cat > .env.production << EOF
JWT_SECRET=$JWT_SECRET
ANON_KEY=$ANON_KEY
SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
SECRET_KEY_BASE=$SECRET_KEY_BASE
API_EXTERNAL_URL=https://app.silk-road.pro/api
SITE_URL=https://app.silk-road.pro
VITE_SUPABASE_URL=https://app.silk-road.pro/api
VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
AI_PROVIDER=mistral
MISTRAL_API_KEY=Cab1kOuWz5DwdrjC1U5MlErCVoM40L9X
MISTRAL_MODEL=mistral-small-latest
SMTP_ADMIN_EMAIL=admin@silk-road.pro

# Google Auth (fill these in manually later on the server)
GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=
GOTRUE_EXTERNAL_GOOGLE_SECRET=
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://app.silk-road.pro/api/auth/v1/callback

EOF

  echo "  → .env.production created with Mistral API Key!"
else
  echo "  → .env.production already exists, skipping."
fi
REMOTE_SCRIPT

# Step 5: SSL setup
echo "→ Setting up SSL..."
ssh "$VPS_HOST" bash << 'REMOTE_SCRIPT'
cd /opt/silk-road-pipeline
mkdir -p ssl

# Try Lets Encrypt first, fall back to self-signed
if command -v certbot &>/dev/null; then
  echo "  → Attempting Lets Encrypt certificate..."
  # Stop anything on port 80 temporarily
  docker compose -f docker-compose.prod.yml --env-file .env.production down 2>/dev/null || true
  
  # Also stop pharm_nginx if it is running to free up port 80
  PHARM_WAS_RUNNING=false
  if docker ps --format '{{.Names}}' | grep -q "^pharm_nginx$"; then
    echo "  → Stopping pharm_nginx temporarily to free port 80..."
    docker stop pharm_nginx > /dev/null
    PHARM_WAS_RUNNING=true
  fi

  certbot certonly --standalone -d app.silk-road.pro --non-interactive --agree-tos -m admin@silk-road.pro 2>/dev/null && {
    cp /etc/letsencrypt/live/app.silk-road.pro/fullchain.pem ssl/app.silk-road.pro.crt
    cp /etc/letsencrypt/live/app.silk-road.pro/privkey.pem ssl/app.silk-road.pro.key
    echo "  → Lets Encrypt certificate installed!"
  } || {
    echo "  → Lets Encrypt failed, using self-signed..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout ssl/app.silk-road.pro.key \
      -out ssl/app.silk-road.pro.crt \
      -subj "/CN=app.silk-road.pro" 2>/dev/null
    echo "  → Self-signed certificate created."
  }

  # Restart pharm_nginx if we stopped it
  if [ "$PHARM_WAS_RUNNING" = true ]; then
    echo "  → Restarting pharm_nginx..."
    docker start pharm_nginx > /dev/null
  fi
else
  echo "  → certbot not found, using self-signed certificate..."
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/app.silk-road.pro.key \
    -out ssl/app.silk-road.pro.crt \
    -subj "/CN=app.silk-road.pro" 2>/dev/null
  echo "  → Self-signed certificate created."
fi

# Patch docker-compose to mount local ssl dir instead of named volume
sed -i 's|ssl-certs:/etc/nginx/ssl:ro|./ssl:/etc/nginx/ssl:ro|' docker-compose.prod.yml 2>/dev/null || true
REMOTE_SCRIPT

# Step 6: Build and start containers
echo "→ Building and starting containers..."
ssh "$VPS_HOST" bash << 'REMOTE_SCRIPT'
cd /opt/silk-road-pipeline
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build 2>&1

echo ""
echo "=== Container status ==="
docker compose -f docker-compose.prod.yml --env-file .env.production ps
REMOTE_SCRIPT

# Step 7: Wait for DB and apply migrations
echo "→ Waiting for database and applying migrations..."
ssh "$VPS_HOST" bash << 'REMOTE_SCRIPT'
cd /opt/silk-road-pipeline
set -e

# Load env variables into bash context safely
set -a
. .env.production
set +a

echo "  → Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
  set +e
  docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db pg_isready -U postgres </dev/null &>/dev/null
  EXIT_CODE=$?
  set -e
  if [ $EXIT_CODE -eq 0 ]; then
    break
  fi
  sleep 2
done

set +e
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db pg_isready -U postgres </dev/null &>/dev/null
EXIT_CODE=$?
set -e

if [ $EXIT_CODE -ne 0 ]; then
  echo "ERROR: PostgreSQL did not become ready in time."
  exit 1
fi

# Detect which password works to avoid set -e aborts
set +e
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T -e PGPASSWORD=postgres db psql -U postgres -d postgres -c "SELECT 1" </dev/null &>/dev/null
IF_EXIT_CODE=$?
set -e

if [ $IF_EXIT_CODE -eq 0 ]; then
  CURRENT_DB_PASSWORD="postgres"
else
  CURRENT_DB_PASSWORD="$POSTGRES_PASSWORD"
fi

echo "  → Updating database role passwords..."
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T -e PGPASSWORD="$CURRENT_DB_PASSWORD" db psql -U postgres -d postgres -c "
  ALTER USER postgres WITH PASSWORD '$POSTGRES_PASSWORD';
  ALTER USER authenticator WITH PASSWORD '$POSTGRES_PASSWORD';
  ALTER USER supabase_admin WITH PASSWORD '$POSTGRES_PASSWORD';
  ALTER USER supabase_auth_admin WITH PASSWORD '$POSTGRES_PASSWORD';
  ALTER USER supabase_storage_admin WITH PASSWORD '$POSTGRES_PASSWORD';
" </dev/null

echo "  → Fixing auth functions ownership..."
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" db psql -U postgres -d postgres -c "
DO \$\$
BEGIN
  ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;
  ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;
  ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;
EXCEPTION WHEN OTHERS THEN
  NULL;
END \$\$;" </dev/null

echo "  → Restarting services to apply credentials..."
docker compose -f docker-compose.prod.yml --env-file .env.production restart auth rest realtime

echo "  → Applying migrations..."
for f in supabase/migrations/*.sql; do
  echo "    Applying: $(basename $f)"
  docker compose -f docker-compose.prod.yml --env-file .env.production exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" db psql -U postgres -d postgres < "$f" 2>&1 | tail -3
done

echo ""
echo "=== Deployment complete! ==="
echo "→ App:     https://app.silk-road.pro"
echo "→ API:     https://app.silk-road.pro/api"
echo "→ Logs:    ssh server1-purity-pharm 'cd /opt/silk-road-pipeline && docker compose -f docker-compose.prod.yml --env-file .env.production logs -f'"
REMOTE_SCRIPT
