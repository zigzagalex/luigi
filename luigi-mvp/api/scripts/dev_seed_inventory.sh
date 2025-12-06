#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
SHOP_ID="${SHOP_ID:-1}"

# Store assumptions:
STORE1_ID="${STORE1_ID:-1}"
STORE2_ID="${STORE2_ID:-2}"
STORE3_ID="${STORE3_ID:-3}"

echo "==> Seeding inventory items for shop_id=${SHOP_ID} against ${API_BASE_URL}"
echo "    Store1=${STORE1_ID}, Store2=${STORE2_ID}, Store3=${STORE3_ID}"

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

########################################
# 1) Fetch all product variants
########################################

VARIANTS_URL="${API_BASE_URL}/v1/product_variants?limit=1000&offset=0"

echo "-> Fetching product variants..."
VARIANTS_JSON="$(curl -sS "${VARIANTS_URL}")"

# Sanity check: must be a JSON array
if ! echo "${VARIANTS_JSON}" | jq '.[0]' >/dev/null 2>&1; then
  echo "Error: response from ${VARIANTS_URL} is not a JSON array:" >&2
  echo "----------------------------------------"
  echo "${VARIANTS_JSON}"
  echo "----------------------------------------"
  exit 1
fi

VARIANT_COUNT="$(echo "${VARIANTS_JSON}" | jq 'length')"
echo "   Found ${VARIANT_COUNT} variants"
echo

########################################
# 2) Helper to create an inventory item
########################################

create_inventory_item() {
  local variant_id="$1"
  local store_id="$2"
  local index="$3"  # just to distinguish tag codes for same variant/store

  local tag_code="S${store_id}-V${variant_id}-${index}"

  echo "   -> Creating inventory item: variant_id=${variant_id}, store_id=${store_id}, tag=${tag_code}"

  RESP="$(
    curl -sS -X POST "${API_BASE_URL}/v1/inventory_items" \
      -H "Content-Type: application/json" \
      -d @- <<JSON
{
  "shop_id": ${SHOP_ID},
  "product_variant_id": ${variant_id},
  "store_id": ${store_id},
  "tag_code": "${tag_code}",
  "serial_number": null,
  "status": "active",
  "service_padding_before": null,
  "service_padding_after": null,
  "is_active": true
}
JSON
  )"

  # Try to pretty print; if not JSON, show raw and fail
  if echo "${RESP}" | jq . >/dev/null 2>&1; then
    local id
    id="$(echo "${RESP}" | jq -r '.id')"
    echo "      OK -> inventory_item_id=${id}"
  else
    echo "!!! Non-JSON response while creating inventory item:" >&2
    echo "----------------------------------------"
    echo "${RESP}"
    echo "----------------------------------------"
    exit 1
  fi
}

########################################
# 3) Iterate variants and apply rules
########################################

echo "-> Creating inventory items for all variants..."
echo "   Rules:"
echo "     - Store ${STORE1_ID}: 1 item per variant"
echo "     - Store ${STORE2_ID}: 2 items per variant"
echo "     - Store ${STORE3_ID}:"
echo "         * All variants of products 1–8 (1 item each)"
echo "         * Only 1 variant of product 9 and 1 variant of product 10"
echo

seen_9=0
seen_10=0

echo "${VARIANTS_JSON}" | jq -c '.[] | {id, product_id}' | while read -r row; do
  variant_id="$(echo "${row}" | jq -r '.id')"
  product_id="$(echo "${row}" | jq -r '.product_id')"

  echo "-> Variant id=${variant_id}, product_id=${product_id}"

  # Store 1: always one item
  create_inventory_item "${variant_id}" "${STORE1_ID}" 1

  # Store 2: always two items
  create_inventory_item "${variant_id}" "${STORE2_ID}" 1
  create_inventory_item "${variant_id}" "${STORE2_ID}" 2

  # Store 3 rules
  if [ "${product_id}" -ge 1 ] && [ "${product_id}" -le 8 ]; then
    # Products 1–8: all variants, one item each
    create_inventory_item "${variant_id}" "${STORE3_ID}" 1
  elif [ "${product_id}" -eq 9 ]; then
    # Product 9: only one variant; pick the first we encounter
    if [ "${seen_9}" -eq 0 ]; then
      create_inventory_item "${variant_id}" "${STORE3_ID}" 1
      seen_9=1
    else
      echo "   (Store ${STORE3_ID}: skipping extra variant for product 9)"
    fi
  elif [ "${product_id}" -eq 10 ]; then
    # Product 10: same logic
    if [ "${seen_10}" -eq 0 ]; then
      create_inventory_item "${variant_id}" "${STORE3_ID}" 1
      seen_10=1
    else
      echo "   (Store ${STORE3_ID}: skipping extra variant for product 10)"
    fi
  else
    echo "   (Store ${STORE3_ID}: no rule for product_id=${product_id}, skipping)"
  fi

  echo
done

echo "==> Inventory seeding finished 🎉"
