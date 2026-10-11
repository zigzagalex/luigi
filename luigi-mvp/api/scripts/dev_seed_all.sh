#!/usr/bin/env bash
set -euo pipefail

# Full local seed happy path:
#   1) SQL admin (+ shop if needed)
#   2) login → session cookie
#   3) stores + catalog via authenticated API (and a few SQL helpers)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=seed_common.sh
source "${SCRIPT_DIR}/seed_common.sh"

SCRIPTS_IN_ORDER=(
  "dev_seed_shop.sh"
  "dev_seed_categories.sh"
  "dev_seed_products.sh"
  "dev_seed_accessories.sh"
  "dev_seed_product_translations.sh"
  "dev_seed_product_variants.sh"
  "dev_seed_assign_categories.sh"
  "dev_seed_inventory.sh"
  "dev_seed_product_variant_images.sh"
  "dev_seed_price_points.sh"
)

echo "==> Full Luigi dev seed"
echo "    API_BASE_URL=${API_BASE_URL}"
echo "    admin=${SEED_ADMIN_EMAIL}"
echo

seed_require_cmds curl jq go
seed_wait_api

echo "----------------------------------------"
echo "-> Seeding admin (SQL)"
chmod +x "${SCRIPT_DIR}/dev_seed_admin.sh"
"${SCRIPT_DIR}/dev_seed_admin.sh"
echo

seed_login
export COOKIE_JAR API_BASE_URL SEED_ADMIN_EMAIL SEED_ADMIN_PASSWORD
# Shop scripts historically used SHOP_ID=1; admin seed creates the first shop as id 1 on a fresh DB.
export SHOP_ID="${SHOP_ID:-1}"

for s in "${SCRIPTS_IN_ORDER[@]}"; do
  full_path="${SCRIPT_DIR}/${s}"
  if [[ ! -f "${full_path}" ]]; then
    echo "ERROR: script not found: ${full_path}" >&2
    exit 1
  fi

  echo "----------------------------------------"
  echo "-> Running: ${s}"
  chmod +x "${full_path}"
  "${full_path}"
  echo "-> Finished: ${s}"
  echo
done

echo "========================================"
echo "==> Full seed completed"
echo "    Admin login: ${SEED_ADMIN_EMAIL} / ${SEED_ADMIN_PASSWORD}"
echo "    Shop id:     ${SHOP_ID}"
echo "========================================"
