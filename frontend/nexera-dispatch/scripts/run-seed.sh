#!/bin/sh
set -e
export PGPASSWORD="$DB_PASSWORD"

# Pull tenant-scoped secrets from env (Secret Manager bindings on the Cloud Run job).
# Empty values are tolerated — the SQL uses NULLIF/COALESCE so missing secrets won't blow away
# whatever is already in tenant_settings, and won't insert empty strings.
# Gemini auth uses ADC, not an API key, so no GEMINI_API_KEY is passed in.
psql "host=/cloudsql/agentic-dispatch:us-central1:nexera-sbx-db dbname=dispatch user=dispatch-user" \
  -v "google_maps_key=${GOOGLE_MAPS_API_KEY:-}" \
  -v "teams_webhook_url=${TEAMS_WEBHOOK_URL:-}" \
  -f /seed-demo.sql

echo "Seed complete"
