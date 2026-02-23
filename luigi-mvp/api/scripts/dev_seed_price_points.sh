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

  # --- PROFESSIONAL (standard + 30 CHF/day) ---
  if [ "$day" -le 3 ]; then
    rate_professional=80
  elif [ "$day" -le 7 ]; then
    rate_professional=70
  else
    rate_professional=60
  fi

  # Convert CHF/day → total cents for that duration
  total_std_cents=$((rate_std * day * 100))
  total_professional_cents=$((rate_professional * day * 100))

  create_price_point "standard" "$day" "$total_std_cents"
  create_price_point "professional"  "$day" "$total_professional_cents"
done

echo "✅ Seeded price_points for categories: standard, professional (1–30 days)."
