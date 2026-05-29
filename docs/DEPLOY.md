# Silk Road Pipeline — VPS Deployment Guide

## Prerequisites

- Ubuntu 22.04+ VPS with at least 2 GB RAM
- Docker & Docker Compose installed
- Domain `app.silk-road.pro` pointing to your VPS IP (A record)
- (Optional) SMTP credentials for email confirmations

---

## 1. Clone the repository

```bash
git clone git@github.com:EB-EU-s-r-o/zip-pwa-factory.git /opt/silk-road-pipeline
cd /opt/silk-road-pipeline
```

## 2. Generate secrets

```bash
# JWT secret (min 32 chars)
JWT_SECRET=$(openssl rand -hex 32)
echo "JWT_SECRET=$JWT_SECRET"

# Secret key base for Realtime (min 64 chars)
SECRET_KEY_BASE=$(openssl rand -hex 64)
echo "SECRET_KEY_BASE=$SECRET_KEY_BASE"

# Postgres password
POSTGRES_PASSWORD=$(openssl rand -hex 16)
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
```

### Generate Supabase API keys

You need two JWT tokens signed with your `JWT_SECRET`:

```bash
# Install jwt-cli or use Node.js:
node -e "
const jwt = require('jsonwebtoken');
const secret = '$JWT_SECRET';
console.log('ANON_KEY=' + jwt.sign({ role: 'anon', iss: 'supabase', iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 10*365*24*3600 }, secret));
console.log('SERVICE_ROLE_KEY=' + jwt.sign({ role: 'service_role', iss: 'supabase', iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 10*365*24*3600 }, secret));
"
```

## 3. Create environment file

```bash
cp .env.production.example .env.production
nano .env.production
```

Fill in all the values you generated above:
- `JWT_SECRET`
- `ANON_KEY`
- `SERVICE_ROLE_KEY`
- `POSTGRES_PASSWORD`
- `SECRET_KEY_BASE`
- `MISTRAL_API_KEY` (your Mistral API key)
- `VITE_SUPABASE_URL=https://app.silk-road.pro/api`
- `VITE_SUPABASE_PUBLISHABLE_KEY=<your ANON_KEY>`

## 4. SSL Certificates

### Option A: Certbot (recommended)

```bash
# Install certbot
sudo apt install -y certbot

# Get certificate (stop nginx first if running)
sudo certbot certonly --standalone -d app.silk-road.pro

# Copy certs to Docker volume location
sudo mkdir -p /opt/silk-road-pipeline/ssl
sudo cp /etc/letsencrypt/live/app.silk-road.pro/fullchain.pem /opt/silk-road-pipeline/ssl/app.silk-road.pro.crt
sudo cp /etc/letsencrypt/live/app.silk-road.pro/privkey.pem /opt/silk-road-pipeline/ssl/app.silk-road.pro.key
```

Update `docker-compose.prod.yml` to mount the real ssl directory:
```yaml
volumes:
  - ./ssl:/etc/nginx/ssl:ro
```

### Option B: Self-signed (for testing only)

```bash
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/app.silk-road.pro.key \
  -out ssl/app.silk-road.pro.crt \
  -subj "/CN=app.silk-road.pro"
```

## 5. Build and start

```bash
# Load env vars and build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## 6. Run database migrations

```bash
# Wait for DB to be ready, then apply all migrations
for f in supabase/migrations/*.sql; do
  docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d postgres < "$f"
done
```

## 7. Verify

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Test the API gateway
curl -s https://app.silk-road.pro/api/rest/v1/ \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>"

# Open in browser
open https://app.silk-road.pro
```

---

## Updating

```bash
cd /opt/silk-road-pipeline
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# If there are new migrations:
for f in supabase/migrations/*.sql; do
  docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d postgres < "$f"
done
```

## Monitoring

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f kong
docker compose -f docker-compose.prod.yml logs -f auth
docker compose -f docker-compose.prod.yml logs -f db

# Restart a service
docker compose -f docker-compose.prod.yml restart frontend
```

## Auto-renew SSL (cron)

```bash
# Add to crontab
0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/app.silk-road.pro/fullchain.pem /opt/silk-road-pipeline/ssl/app.silk-road.pro.crt && cp /etc/letsencrypt/live/app.silk-road.pro/privkey.pem /opt/silk-road-pipeline/ssl/app.silk-road.pro.key && docker compose -f /opt/silk-road-pipeline/docker-compose.prod.yml restart frontend
```
