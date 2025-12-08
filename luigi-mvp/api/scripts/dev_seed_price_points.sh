#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"

create_price_point() {
  local category="$1"
  local day_count="$2"
  local price_total_cents="$3"

  echo "Upserting price point: category=${category}, day_count=${day_count}, total=${price_total_cents} cents"

  curl -sS -X PUT "${BASE_URL}/v1/price_points/${category}/${day_count}" \
    -H "Content-Type: application/json" \
    -d "{\"price_total_cents\": ${price_total_cents}}" \
    >/dev/null
}

# Seed 1–30 days (adjust if you want fewer)
for day in $(seq 1 30); do
  # --- STANDARD ---
  if [ "$day" -le 3 ]; then
    rate_std=50   # CHF / day
  elif [ "$day" -le 7 ]; then
    rate_std=40
  else
    rate_std=30
  fi

  # --- PREMIUM (standard + 30 CHF/day) ---
  if [ "$day" -le 3 ]; then
    rate_premium=80
  elif [ "$day" -le 7 ]; then
    rate_premium=70
  else
    rate_premium=60
  fi

  # Convert CHF/day → total cents for that duration
  total_std_cents=$((rate_std * day * 100))
  total_premium_cents=$((rate_premium * day * 100))

  create_price_point "standard" "$day" "$total_std_cents"
  create_price_point "premium"  "$day" "$total_premium_cents"
done

echo "✅ Seeded price_points for categories: standard, premium (1–30 days)."
