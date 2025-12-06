#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
SHOP_ID="${SHOP_ID:-1}"

echo "==> Seeding products for shop_id=${SHOP_ID} against ${API_BASE_URL}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command '$1' not found. Install it first." >&2
    exit 1
  fi
}

require_cmd curl
require_cmd jq

# Optional: quick health check
echo "-> Checking API health..."
if ! curl -sSf "${API_BASE_URL}/health" >/dev/null 2>&1; then
  echo "Error: API health check failed at ${API_BASE_URL}/health" >&2
  exit 1
fi
echo "   API is up ✅"

BASE="${API_BASE_URL}"

create_product() {
  local name="$1"
  local sku="$2"            # can be empty string -> null
  local desc="$3"           # can be empty string -> null
  local price_category="$4" # "standard" | "professional"

  echo "   -> Creating product: ${name} [${price_category}]"

  # build JSON with nulls when empty
  local sku_json desc_json
  if [ -z "${sku}" ]; then
    sku_json="null"
  else
    sku_json="\"${sku}\""
  fi

  if [ -z "${desc}" ]; then
    desc_json="null"
  else
    desc_json="\"${desc}\""
  fi

  RESP="$(
    curl -sS -X POST "${BASE}/v1/products" \
      -H "Content-Type: application/json" \
      -d @- <<JSON
{
  "shop_id": ${SHOP_ID},
  "sku": ${sku_json},
  "name": "${name}",
  "description": ${desc_json},
  "price_category": "${price_category}",
  "is_active": true
}
JSON
  )"

  echo "${RESP}" | jq .
  echo
}

########################################
# STANDARD category (5 products)
# - 2 MTB
# - 3 Road
########################################

echo "-> Creating STANDARD products..."

# Mountain bikes (standard)
create_product \
  "Standard MTB Trail 1" \
  "STD-MTB-TRAIL-1" \
  "Hardtail mountain bike for light trail riding." \
  "standard"

create_product \
  "Standard MTB Trail 2" \
  "STD-MTB-TRAIL-2" \
  "Entry-level full-suspension MTB for weekend rides." \
  "standard"

# Road bikes (standard)
create_product \
  "Standard Road Endurance 1" \
  "STD-RD-END-1" \
  "Endurance road bike for relaxed long-distance rides." \
  "standard"

create_product \
  "Standard Road Endurance 2" \
  "STD-RD-END-2" \
  "Comfort-focused road bike for mixed city and road use." \
  "standard"

create_product \
  "Standard Road City 1" \
  "STD-RD-CITY-1" \
  "Flat-bar road/city bike for daily commuting." \
  "standard"

########################################
# PROFESSIONAL category (5 products)
# - 2 MTB
# - 3 Road
########################################

echo "-> Creating PROFESSIONAL products..."

# Mountain bikes (pro)
create_product \
  "Pro MTB Enduro 1" \
  "PRO-MTB-END-1" \
  "High-end enduro MTB with long-travel suspension." \
  "professional"

create_product \
  "Pro MTB Downhill 1" \
  "PRO-MTB-DH-1" \
  "Downhill MTB for bike park and race tracks." \
  "professional"

# Road bikes (pro)
create_product \
  "Pro Road Race 1" \
  "PRO-RD-RACE-1" \
  "Carbon race bike optimised for climbing and sprinting." \
  "professional"

create_product \
  "Pro Road Aero 1" \
  "PRO-RD-AERO-1" \
  "Aero road bike for flat and fast courses." \
  "professional"

create_product \
  "Pro Road Gravel 1" \
  "PRO-RD-GRVL-1" \
  "Gravel bike for mixed-surface adventures and bikepacking." \
  "professional"

echo "==> Product seeding finished 🎉"
