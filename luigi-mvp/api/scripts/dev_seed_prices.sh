#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
SHOP_ID="${SHOP_ID:-1}"

echo "==> Seeding prices for shop_id=${SHOP_ID} against ${API_BASE_URL}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command '$1' not found. Install it first." >&2
    exit 1
  fi
}

require_cmd curl
require_cmd jq

# Health check
echo "-> Checking API health..."
if ! curl -sSf "${API_BASE_URL}/health" >/dev/null 2>&1; then
  echo "Error: API health check failed at ${API_BASE_URL}/health" >&2
  exit 1
fi
echo "   API is up ✅"

