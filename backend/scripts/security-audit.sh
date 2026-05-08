#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

check() {
  local name="$1"
  local result="$2"
  if [[ "$result" == "pass" ]]; then
    echo -e "${GREEN}[PASS]${NC} $name"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}[FAIL]${NC} $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== ConfigForge Security Audit ==="
echo ""

# 1. List ALL db.raw usages and flag unsafe interpolation
RAW_USAGES=$(grep -rn "db\.raw" src/ || true)
if [ -n "$RAW_USAGES" ]; then
  echo "Raw SQL usages found:"
  echo "$RAW_USAGES"
  echo ""
  UNSAFE=$(echo "$RAW_USAGES" | grep -c '\${' || true)
  if [ "$UNSAFE" -gt 0 ]; then
    check "1. No unsafe raw SQL interpolation" "fail"
  else
    check "1. No unsafe raw SQL interpolation" "pass"
  fi
else
  check "1. No unsafe raw SQL interpolation" "pass"
fi

# 2. Verify all process.env vars have .env.example entries
echo ""
ENV_VARS=$(grep -rho "process\.env\.\([A-Z_]*\)" src/ | sed "s/process\.env\.//" | sort -u || true)
MISSING=0
for var in $ENV_VARS; do
  if ! grep -q "^${var}=" .env.example 2>/dev/null; then
    echo "  MISSING from .env.example: $var"
    MISSING=$((MISSING + 1))
  fi
done
if [ "$MISSING" -gt 0 ]; then
  check "2. All env vars documented in .env.example" "fail"
else
  check "2. All env vars documented in .env.example" "pass"
fi

# 3. Hardcoded secrets check
SECRETS=$(grep -rn "supersecret\|REPLACE_ME\|your-secret" src/ || true)
if [ -z "$SECRETS" ]; then
  check "3. No hardcoded secrets (supersecret/REPLACE_ME/your-secret)" "pass"
else
  echo "$SECRETS"
  check "3. No hardcoded secrets (supersecret/REPLACE_ME/your-secret)" "fail"
fi

# 4. Template-literal SQL interpolation
SQL_INTERP=$(grep -rn 'SELECT.*FROM.*\${' src/ || true)
if [ -z "$SQL_INTERP" ]; then
  check "4. No SELECT-FROM template-literal interpolation" "pass"
else
  echo "$SQL_INTERP"
  check "4. No SELECT-FROM template-literal interpolation" "fail"
fi

# 5. Helmet imported and used in security middleware
if grep -q "helmet" src/middleware/security.ts 2>/dev/null; then
  check "5. Helmet middleware present" "pass"
else
  check "5. Helmet middleware present" "fail"
fi

# 6. CORS not set to wildcard in production (uses CORS_ORIGIN env var)
if grep -q "CORS_ORIGIN" src/middleware/security.ts 2>/dev/null; then
  check "6. CORS configured via CORS_ORIGIN env var" "pass"
else
  check "6. CORS configured via CORS_ORIGIN env var" "fail"
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
