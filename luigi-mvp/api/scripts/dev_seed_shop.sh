#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"

echo "==> Seeding Luigi dev data against ${API_BASE_URL}"

# --- Helpers -------------------------------------------------------------

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

# --- 1) Create shop: Luigi's Bike Shop -----------------------------------

echo "-> Creating shop 'Luigi's Bike Shop'..."

SHOP_RESP="$(
  curl -sS -X POST "${API_BASE_URL}/v1/shops/" \
    -H "Content-Type: application/json" \
    -d @- <<'JSON'
{
  "name": "Luigi's Bike Shop",
  "timezone": "Europe/Zurich",
  "is_active": true
}
JSON
)"

echo "   Shop response: ${SHOP_RESP}"

# Adjust .id here if your JSON uses a different field name
SHOP_ID="$(echo "${SHOP_RESP}" | jq -r '.id')"

if [ -z "${SHOP_ID}" ] || [ "${SHOP_ID}" = "null" ]; then
  echo "Error: could not extract shop id from response" >&2
  exit 1
fi

echo "   Created shop with id: ${SHOP_ID}"

# --- 2) Create stores for Luigi's Bike Shop ------------------------------

echo "-> Creating stores for shop ${SHOP_ID}..."

create_store() {
  local name="$1"
  local address1="$2"
  local postal="$3"
  local city="$4"
  local country="$5"
  local timezone="$6"

  echo "   -> Creating store: ${name} (${city})"

  curl -sS -X POST "${API_BASE_URL}/v1/stores" \
    -H "Content-Type: application/json" \
    -d @- <<JSON
{
  "shop_id": ${SHOP_ID},
  "name": "${name}",
  "address1": "${address1}",
  "address2": null,
  "postal_code": "${postal}",
  "city": "${city}",
  "country": "${country}",
  "timezone": "${timezone}",
  "is_active": true
}
JSON

  echo    # newline for readability
}

# Geneva
create_store \
  "Luigi's Bike Shop Geneva" \
  "Rue du Rhône 1" \
  "1204" \
  "Geneva" \
  "Switzerland" \
  "Europe/Zurich"

# Zurich
create_store \
  "Luigi's Bike Shop Zürich" \
  "Bahnhofstrasse 10" \
  "8001" \
  "Zurich" \
  "Switzerland" \
  "Europe/Zurich"

# Bern
create_store \
  "Luigi's Bike Shop Bern" \
  "Marktgasse 5" \
  "3011" \
  "Bern" \
  "Switzerland" \
  "Europe/Zurich"

echo "==> Seeding shop and stores finished 🎉"
