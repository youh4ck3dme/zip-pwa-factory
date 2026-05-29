#!/usr/bin/env bash
# Print or write local Supabase connection vars (from `supabase start`).
set -euo pipefail
cd "$(dirname "$0")/.."

# Supabase CLI may exit non-zero when optional services are stopped — parse env output anyway.
ENV_LINES="$(supabase status -o env 2>/dev/null || true)"
API_URL="$(printf '%s\n' "$ENV_LINES" | sed -n 's/^API_URL="\(.*\)"$/\1/p')"
ANON_KEY="$(printf '%s\n' "$ENV_LINES" | sed -n 's/^ANON_KEY="\(.*\)"$/\1/p')"

if [ -z "$API_URL" ] || [ -z "$ANON_KEY" ]; then
  echo "Local Supabase is not running. Start with: npm run db:start" >&2
  exit 1
fi

write_env() {
  cat <<EOF
# Local Docker Supabase (supabase start)
VITE_SUPABASE_URL=${API_URL}
VITE_SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}
EOF
}

if [ "${1:-}" = "--write" ]; then
  write_env > .env.local
  echo "Wrote .env.local (VITE_SUPABASE_URL=${API_URL})" >&2
else
  write_env
fi
