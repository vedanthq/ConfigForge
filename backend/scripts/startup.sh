#!/bin/sh

echo "=== ConfigForge Production Startup ==="

echo "[startup] Running database migrations..."
if ./node_modules/.bin/tsx ./node_modules/knex/bin/cli.js migrate:latest --knexfile ./knexfile.ts 2>&1; then
  echo "[startup] Migrations completed successfully"
  echo "[startup] Running database seeds..."
  ./node_modules/.bin/tsx ./node_modules/knex/bin/cli.js seed:run --knexfile ./knexfile.ts 2>&1
else
  echo "[startup] WARNING: Migrations failed — PostgreSQL may not be ready yet"
  echo "[startup] Server will start in degraded mode, DB will be retried in background"
fi

echo "[startup] Starting application server..."
exec node dist/index.js
