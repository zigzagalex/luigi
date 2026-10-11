#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=seed_common.sh
source "${SCRIPT_DIR}/seed_common.sh"

echo "==> Seeding shop/stores against ${API_BASE_URL}"

seed_require_cmds curl jq
seed_wait_api

if [[ ! -f "${COOKIE_JAR}" ]]; then
  seed_login
fi

# Prefer the shop created by seedadmin (usually id=1 on a fresh DB).
SHOP_ID="${SHOP_ID:-}"
if [[ -z "${SHOP_ID}" ]]; then
  SHOP_ID="$(api_curl "${API_BASE_URL}/v1/shops?limit=1" | jq -r '.[0].id // empty')"
fi

if [[ -z "${SHOP_ID}" || "${SHOP_ID}" == "null" ]]; then
  echo "-> No shop found; creating 'Luigi's Bike Shop'..."
  SHOP_RESP="$(
    api_curl -X POST "${API_BASE_URL}/v1/shops/" \
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
  SHOP_ID="$(echo "${SHOP_RESP}" | jq -r '.id')"
  if [[ -z "${SHOP_ID}" || "${SHOP_ID}" == "null" ]]; then
    echo "Error: could not extract shop id from response" >&2
    exit 1
  fi
else
  echo "-> Reusing shop id=${SHOP_ID}"
fi

export SHOP_ID
echo "   Using shop_id=${SHOP_ID}"

echo "-> Creating stores for shop ${SHOP_ID}..."

create_store() {
  local name="$1"
  local address1="$2"
  local postal="$3"
  local city="$4"
  local country="$5"
  local timezone="$6"

  echo "   -> Creating store: ${name} (${city})"

  api_curl -X POST "${API_BASE_URL}/v1/stores" \
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

  echo
}

create_store \
  "Luigi's Bike Shop Geneva" \
  "Rue du Rhône 1" \
  "1204" \
  "Geneva" \
  "Switzerland" \
  "Europe/Zurich"

create_store \
  "Luigi's Bike Shop Zürich" \
  "Bahnhofstrasse 10" \
  "8001" \
  "Zurich" \
  "Switzerland" \
  "Europe/Zurich"

create_store \
  "Luigi's Bike Shop Bern" \
  "Marktgasse 5" \
  "3011" \
  "Bern" \
  "Switzerland" \
  "Europe/Zurich"

echo "==> Seeding shop and stores finished"
echo "${SHOP_ID}" > "${SCRIPT_DIR}/.seed_shop_id"
