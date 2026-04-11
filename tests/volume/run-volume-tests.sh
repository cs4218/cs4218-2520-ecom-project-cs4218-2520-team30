#!/usr/bin/env bash
# Author: Boh Xiang You Basil (A0273232M)
# Volume tests: large seeded MongoDB dataset + k6 driving read-heavy API paths
# (pagination, regex search, category scans, binary photos, large order lists).
# Correlate k6 latency with MongoDB metrics (mongostat / Atlas) for DB memory & I/O.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"
VOLUME_MONGO_URL="${VOLUME_MONGO_URL:-mongodb://localhost:27017/virtualvault_volume_test}"
BASE_URL="${BASE_URL:-http://localhost:6060}"
SERVER_PID=""
PASS_COUNT=0
FAIL_COUNT=0

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    echo ""
    echo "Stopping Express server (PID $SERVER_PID) …"
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# ── Pre-flight checks ──

if ! command -v k6 &>/dev/null; then
  echo "ERROR: k6 is not installed."
  echo "Install via:  brew install k6          (macOS)"
  echo "         or:  https://grafana.com/docs/k6/latest/set-up/install-k6/"
  exit 1
fi

echo "k6 version: $(k6 version)"
echo "MongoDB URL: $VOLUME_MONGO_URL"
echo "Base URL:    $BASE_URL"
echo ""

mkdir -p "$RESULTS_DIR"

# ── Start Express server if not already running ──

if curl -s --max-time 2 "$BASE_URL" >/dev/null 2>&1; then
  echo "Express server already running at $BASE_URL"
else
  echo "Starting Express server …"
  cd "$PROJECT_ROOT"
  MONGO_URL="$VOLUME_MONGO_URL" JWT_SECRET="${JWT_SECRET:-volume-test-jwt-secret}" \
    PORT="${PORT:-6060}" DEV_MODE=volume \
    node server.js &
  SERVER_PID=$!
  echo "Waiting for server (PID $SERVER_PID) …"
  for i in $(seq 1 30); do
    if curl -s --max-time 2 "$BASE_URL" >/dev/null 2>&1; then
      echo "Server ready."
      break
    fi
    if [ "$i" -eq 30 ]; then
      echo "ERROR: Server failed to start within 30 s."
      exit 1
    fi
    sleep 1
  done
fi

# ── Seed data ──

echo ""
echo "═══════════════════════════════════════════"
echo "  Seeding volume test data"
echo "═══════════════════════════════════════════"
cd "$PROJECT_ROOT"
VOLUME_MONGO_URL="$VOLUME_MONGO_URL" node tests/volume/seed-data.js

# ── Run scenarios ──

SCENARIOS=(
  "browse-catalog"
  "search-products"
  "auth-flow"
  "order-history"
  "mixed-workload"
)

for scenario in "${SCENARIOS[@]}"; do
  echo ""
  echo "═══════════════════════════════════════════"
  echo "  Running scenario: $scenario"
  echo "═══════════════════════════════════════════"

  set +e
  k6 run \
    --out "json=$RESULTS_DIR/${scenario}-results.json" \
    --env "BASE_URL=$BASE_URL" \
    "$SCRIPT_DIR/scenarios/${scenario}.js" 2>&1 | tee "$RESULTS_DIR/${scenario}-stdout.txt"
  EXIT_CODE=${PIPESTATUS[0]}
  set -e

  if [ "$EXIT_CODE" -eq 0 ]; then
    echo "  ✓ $scenario PASSED"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  ✗ $scenario FAILED (exit code $EXIT_CODE)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

# ── Cleanup seed data ──

echo ""
echo "═══════════════════════════════════════════"
echo "  Cleaning up volume test data"
echo "═══════════════════════════════════════════"
cd "$PROJECT_ROOT"
VOLUME_MONGO_URL="$VOLUME_MONGO_URL" node tests/volume/seed-data.js --clean

# ── Summary ──

echo ""
echo "═══════════════════════════════════════════"
echo "  VOLUME TEST SUMMARY"
echo "═══════════════════════════════════════════"
echo "  Passed: $PASS_COUNT / ${#SCENARIOS[@]}"
echo "  Failed: $FAIL_COUNT / ${#SCENARIOS[@]}"
echo ""
echo "  Results: $RESULTS_DIR/"
echo "═══════════════════════════════════════════"

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
