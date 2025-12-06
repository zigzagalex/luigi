#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
VARIANTS_PATH="${VARIANTS_PATH:-/v1/product_variants}"

echo "==> Seeding product variants against ${API_BASE_URL}${VARIANTS_PATH}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command '$1' not found. Install it first." >&2
    exit 1
  fi
}

require_cmd curl
require_cmd jq

# Optional: health check
echo "-> Checking API health..."
if ! curl -sSf "${API_BASE_URL}/health" >/dev/null 2>&1; then
  echo "Error: API health check failed at ${API_BASE_URL}/health" >&2
  exit 1
fi
echo "   API is up ✅"

BASE="${API_BASE_URL}${VARIANTS_PATH}"

create_variant() {
  local product_id="$1"
  local label="$2"
  local attributes_json="$3"  # raw JSON: e.g. '{ "size": "S", "color": "black" }'

  echo "   -> Creating variant for product ${product_id}: ${label} with attrs ${attributes_json}"

  RESP="$(
    curl -sS -X POST "${BASE}" \
      -H "Content-Type: application/json" \
      -d @- <<JSON
{
  "product_id": ${product_id},
  "label": "${label}",
  "attributes": ${attributes_json},
  "is_active": true
}
JSON
  )"

  echo "${RESP}" | jq .
  echo
}

########################################
# Products 1–8: one variant each
# size: S, color: black
########################################

echo "-> Seeding single variants for products 1–8 (S / black)..."

for pid in 1 2 3 4 5 6 7 8; do
  create_variant \
    "${pid}" \
    "Size S / Black" \
    '{ "size": "S", "color": "black" }'
done

########################################
# Product 9: three variants
# - S / black
# - M / black
# - S / blue
########################################

echo "-> Seeding variants for product 9..."

create_variant \
  9 \
  "Size S / Black" \
  '{ "size": "S", "color": "black" }'

create_variant \
  9 \
  "Size M / Black" \
  '{ "size": "M", "color": "black" }'

create_variant \
  9 \
  "Size S / Blue" \
  '{ "size": "S", "color": "blue" }'

########################################
# Product 10: same three variants
########################################

echo "-> Seeding variants for product 10..."

create_variant \
  10 \
  "Size S / Black" \
  '{ "size": "S", "color": "black" }'

create_variant \
  10 \
  "Size M / Black" \
  '{ "size": "M", "color": "black" }'

create_variant \
  10 \
  "Size S / Blue" \
  '{ "size": "S", "color": "blue" }'

echo "==> Product variant seeding finished 🎉"
