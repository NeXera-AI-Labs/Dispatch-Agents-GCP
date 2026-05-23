#!/bin/sh
set -e
export PGPASSWORD="$DB_PASSWORD"

# Pull tenant-scoped secrets from env (Secret Manager bindings on the Cloud Run job).
# Empty values are tolerated — the SQL uses NULLIF/COALESCE so missing secrets won't blow away
# whatever is already in tenant_settings, and won't insert empty strings.
psql "host=/cloudsql/agentic-dispatch:us-central1:nexera-sbx-db dbname=dispatch user=dispatch-user" \
  -v "google_maps_key=${GOOGLE_MAPS_API_KEY:-}" \
  -v "teams_webhook_url=${TEAMS_WEBHOOK_URL:-}" \
  -v "gemini_api_key=${GEMINI_API_KEY:-}" \
  -f /seed-demo.sql

echo "Seed complete"
