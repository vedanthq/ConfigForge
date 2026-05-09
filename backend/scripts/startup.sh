#!/bin/sh
set -e

echo "=== ConfigForge Production Startup ==="

echo "Running database migrations..."
./node_modules/.bin/tsx ./node_modules/knex/bin/cli.js migrate:latest --knexfile ./knexfile.ts 2>&1

echo "Running database seeds..."
./node_modules/.bin/tsx ./node_modules/knex/bin/cli.js seed:run --knexfile ./knexfile.ts 2>&1

echo "Starting application server..."
exec node dist/index.js
