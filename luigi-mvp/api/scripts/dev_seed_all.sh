#!/usr/bin/env bash
set -euo pipefail

# Resolve directory of this script so it works from anywhere
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SCRIPTS_IN_ORDER=(
  "dev_seed_shop.sh"
  "dev_seed_categories.sh"
  "dev_seed_products.sh"
  "dev_seed_product_variants.sh"
  "dev_seed_assign_categories.sh"
  "dev_seed_inventory.sh"
  "dev_seed_product_variant_images.sh"
)

echo "==> Running full dev seed using scripts in ${SCRIPT_DIR}"
echo "    API_BASE_URL=${API_BASE_URL:-http://localhost:8080}"
echo

for s in "${SCRIPTS_IN_ORDER[@]}"; do
  full_path="${SCRIPT_DIR}/${s}"

  if [ ! -f "${full_path}" ]; then
    echo "ERROR: script not found: ${full_path}" >&2
    exit 1
  fi

  echo "----------------------------------------"
  echo "-> Making executable and running: ${s}"
  chmod +x "${full_path}"
  "${full_path}"
  echo "-> Finished: ${s}"
  echo
done

echo "========================================"
echo "==> All dev seed scripts completed 🎉"
echo "========================================"
