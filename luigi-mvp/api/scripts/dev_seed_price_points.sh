#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=seed_common.sh
source "${SCRIPT_DIR}/seed_common.sh"

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
BASE_URL="${API_BASE_URL}"

seed_require_cmds curl jq
seed_wait_api
if [[ ! -f "${COOKIE_JAR}" ]]; then
  seed_login
fi

create_price_point() {
  local category="$1"
  local day_count="$2"
  local price_total_cents="$3"

  echo "Upserting price point: category=${category}, day_count=${day_count}, total=${price_total_cents} cents"

  api_curl -X PUT "${BASE_URL}/v1/price_points/${category}/${day_count}" \
    -H "Content-Type: application/json" \
    -d "{\"price_total_cents\": ${price_total_cents}}" \
    >/dev/null
}

# Seed 1–30 days with tiered effective CHF/day (multiplied by day_count for total cents),
# matching the bike scripts: short trips pay a higher per-day band, longer trips a lower band.
seed_price_category_tiered() {
  local category="$1"
  local rate_short="$2"   # CHF / day equivalent for day_count 1–3
  local rate_mid="$3"     # days 4–7
  local rate_long="$4"    # days 8–30

  local day
  for day in $(seq 1 30); do
    local rate
    if [ "$day" -le 3 ]; then
      rate=$rate_short
    elif [ "$day" -le 7 ]; then
      rate=$rate_mid
    else
      rate=$rate_long
    fi

    local total_cents=$((rate * day * 100))
    create_price_point "$category" "$day" "$total_cents"
  done
}

# Bikes: full-day rental bands (CHF/day equivalent)
seed_price_category_tiered "standard"       50 40 30
seed_price_category_tiered "professional" 80 70 60

# Accessories: add-on rental — same formula, much lower totals than bikes
#  - accessory_compact: small parts (mounts, tool kits, kids bundles)
#  - accessory_standard: pedals, most helmets, everyday protection
#  - accessory_premium: performance shoes + flagship helmets
seed_price_category_tiered "accessory_compact"  6  5  4
seed_price_category_tiered "accessory_standard"  11 9  7
seed_price_category_tiered "accessory_premium"  17 14 11

echo "✅ Seeded price_points for: standard, professional, accessory_compact, accessory_standard, accessory_premium (1–30 days each)."
