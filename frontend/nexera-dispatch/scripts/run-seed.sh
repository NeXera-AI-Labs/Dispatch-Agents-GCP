#!/bin/sh
set -e
export PGPASSWORD="$DB_PASSWORD"
psql "host=/cloudsql/agentic-dispatch:us-central1:nexera-sbx-db dbname=dispatch user=dispatch-user" -f /seed-demo.sql
echo "Seed complete"
