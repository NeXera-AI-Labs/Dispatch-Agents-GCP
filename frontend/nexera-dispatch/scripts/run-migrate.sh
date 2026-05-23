#!/bin/sh
set -e
psql "postgresql://dispatch-user:${DB_PASSWORD}@/dispatch?host=/cloudsql/agentic-dispatch:us-central1:nexera-sbx-db" -f /migrate.sql
echo "Migration complete"
