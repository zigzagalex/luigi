#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=seed_common.sh
source "${SCRIPT_DIR}/seed_common.sh"

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
SHOP_ID="${SHOP_ID:-1}"

echo "==> Assigning product categories for shop_id=${SHOP_ID} against ${API_BASE_URL}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command '$1' not found. Install it first." >&2
    exit 1
  fi
}

require_cmd curl
require_cmd jq

# Health check
seed_require_cmds curl jq
seed_wait_api
if [[ ! -f "${COOKIE_JAR}" ]]; then
  seed_login
fi

########################################
# 1) Fetch categories and resolve IDs by slug
########################################

echo "-> Fetching categories for shop_id=${SHOP_ID}..."
CATS_JSON="$(api_curl "${API_BASE_URL}/v1/categories?shop_id=${SHOP_ID}")"

# Helper to get category id by slug
get_cat_id() {
  local slug="$1"
  local id
  id="$(echo "${CATS_JSON}" | jq -r --arg slug "$slug" '.[] | select(.slug == $slug) | .id' | head -n1)"
  if [ -z "${id}" ] || [ "${id}" = "null" ]; then
    echo "Error: could not find category with slug='${slug}'" >&2
    exit 1
  fi
  echo "${id}"
}

CAT_MTB_ID="$(get_cat_id "mountain-bikes")"
CAT_MTB_FULLY_ID="$(get_cat_id "fully")"
CAT_MTB_HARDTAIL_ID="$(get_cat_id "hardtail")"
CAT_MTB_E_ID="$(get_cat_id "electric-mountain-bikes")"

CAT_ROAD_ID="$(get_cat_id "road-bikes")"
CAT_ROAD_RACE_ID="$(get_cat_id "road-race")"
CAT_ROAD_TOURING_ID="$(get_cat_id "touring")"
CAT_ROAD_TRI_ID="$(get_cat_id "triathlon")"
CAT_ROAD_CITY_ID="$(get_cat_id "city-road")"
CAT_ROAD_E_ID="$(get_cat_id "electric-road-bikes")"

echo "   Resolved category IDs:"
echo "     Mountain Bikes:        ${CAT_MTB_ID}"
echo "       - Fully:             ${CAT_MTB_FULLY_ID}"
echo "       - Hardtail:          ${CAT_MTB_HARDTAIL_ID}"
echo "       - Electric MTB:      ${CAT_MTB_E_ID}"
echo "     Road Bikes:            ${CAT_ROAD_ID}"
echo "       - Road Race:         ${CAT_ROAD_RACE_ID}"
echo "       - Touring:           ${CAT_ROAD_TOURING_ID}"
echo "       - Triathlon:         ${CAT_ROAD_TRI_ID}"
echo "       - City:              ${CAT_ROAD_CITY_ID}"
echo "       - Electric Road:     ${CAT_ROAD_E_ID}"
echo

########################################
# 2) Helper to assign category IDs to a product
########################################

assign_cats() {
  local product_id="$1"
  local cat_ids_json="$2"  # e.g. "[1,2]"

  echo "-> Assigning product ${product_id} to categories ${cat_ids_json}"

  HTTP_CODE="$(
    api_curl -o /dev/null -w "%{http_code}" \
      -X PUT "${API_BASE_URL}/v1/products/${product_id}/categories" \
      -H "Content-Type: application/json" \
      -d "{\"category_ids\": ${cat_ids_json}}"
  )"

  if [ "${HTTP_CODE}" != "204" ]; then
    echo "   ERROR: expected 204, got ${HTTP_CODE} for product_id=${product_id}" >&2
    exit 1
  fi

  echo "   OK (204 No Content)"
  echo
}

########################################
# 3) Map products -> categories
########################################

# Products (from your DB):
#  1 | Standard MTB Trail 1
#  2 | Standard MTB Trail 2
#  3 | Standard Road Endurance 1
#  4 | Standard Road Endurance 2
#  5 | Standard Road City 1
#  6 | Pro MTB Enduro 1
#  7 | Pro MTB Downhill 1
#  8 | Pro Road Race 1
#  9 | Pro Road Aero 1
# 10 | Pro Road Gravel 1

echo "-> Assigning categories to products..."

# 1: Standard MTB Trail 1 -> Mountain Bikes + Hardtail
assign_cats 1 "[${CAT_MTB_ID}, ${CAT_MTB_HARDTAIL_ID}]"

# 2: Standard MTB Trail 2 -> Mountain Bikes + Fully
assign_cats 2 "[${CAT_MTB_ID}, ${CAT_MTB_FULLY_ID}]"

# 3: Standard Road Endurance 1 -> Road Bikes + Touring
assign_cats 3 "[${CAT_ROAD_ID}, ${CAT_ROAD_TOURING_ID}]"

# 4: Standard Road Endurance 2 -> Road Bikes + Touring
assign_cats 4 "[${CAT_ROAD_ID}, ${CAT_ROAD_TOURING_ID}]"

# 5: Standard Road City 1 -> Road Bikes + City
assign_cats 5 "[${CAT_ROAD_ID}, ${CAT_ROAD_CITY_ID}]"

# 6: Pro MTB Enduro 1 -> Mountain Bikes + Fully
assign_cats 6 "[${CAT_MTB_ID}, ${CAT_MTB_FULLY_ID}]"

# 7: Pro MTB Downhill 1 -> Mountain Bikes + Fully
assign_cats 7 "[${CAT_MTB_ID}, ${CAT_MTB_FULLY_ID}]"

# 8: Pro Road Race 1 -> Road Bikes + Road Race
assign_cats 8 "[${CAT_ROAD_ID}, ${CAT_ROAD_RACE_ID}]"

# 9: Pro Road Aero 1 -> Road Bikes + Road Race
assign_cats 9 "[${CAT_ROAD_ID}, ${CAT_ROAD_RACE_ID}]"

# 10: Pro Road Gravel 1 -> Road Bikes + City + Touring
assign_cats 10 "[${CAT_ROAD_ID}, ${CAT_ROAD_CITY_ID}, ${CAT_ROAD_TOURING_ID}]"

echo "==> Product category assignment finished 🎉"