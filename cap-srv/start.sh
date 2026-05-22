#!/bin/sh
set -e
echo "[start] Running schema migration..."
node migrate.js
echo "[start] Migration complete. Starting cds-serve..."
exec npx cds-serve
