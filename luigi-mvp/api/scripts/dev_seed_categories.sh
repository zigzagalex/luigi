#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"

# By default we assume the first shop created (Luigi's Bike Shop) has id 1.
SHOP_ID="${SHOP_ID:-1}"

echo "==> Seeding categories for shop_id=${SHOP_ID} against ${API_BASE_URL}"

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

########################################
# Mountain Bikes + children
########################################

echo "-> Creating Mountain Bikes root category..."
MTB_JSON="$(
  curl -sS -X POST "${BASE}/v1/categories" \
    -H "Content-Type: application/json" \
    -d @- <<JSON
{
  "shop_id": ${SHOP_ID},
  "slug": "mountain-bikes",
  "name": "Mountain Bikes",
  "description": "All off-road bikes: hardtail, fully, and electric.",
  "is_active": true
}
JSON
)"
echo "Created root category: Mountain Bikes"
echo "${MTB_JSON}" | jq .

export CAT_MTB_ID="$(echo "${MTB_JSON}" | jq -r '.id')"

########################################
# Fully
########################################
echo "-> Creating subcategory: Fully..."
MTB_FULLY_JSON="$(
  curl -sS -X POST "${BASE}/v1/categories" \
    -H "Content-Type: application/json" \
    -d @- <<JSON
{
  "shop_id": ${SHOP_ID},
  "parent_id": ${CAT_MTB_ID},
  "slug": "fully",
  "name": "Fully",
  "description": "Full-suspension mountain bikes.",
  "is_active": true
}
JSON
)"
echo "Created subcategory: Fully"
echo "${MTB_FULLY_JSON}" | jq .
export CAT_MTB_FULLY_ID="$(echo "${MTB_FULLY_JSON}" | jq -r '.id')"

########################################
# Hardtail
########################################
echo "-> Creating subcategory: Hardtail..."
MTB_HARDTAIL_JSON="$(
  curl -sS -X POST "${BASE}/v1/categories" \
    -H "Content-Type: application/json" \
    -d @- <<JSON
{
  "shop_id": ${SHOP_ID},
  "parent_id": ${CAT_MTB_ID},
  "slug": "hardtail",
  "name": "Hardtail",
  "description": "Front-suspension (hardtail) mountain bikes.",
  "is_active": true
}
JSON
)"
echo "Created subcategory: Hardtail"
echo "${MTB_HARDTAIL_JSON}" | jq .
export CAT_MTB_HARDTAIL_ID="$(echo "${MTB_HARDTAIL_JSON}" | jq -r '.id')"

########################################
# Electric MTB
########################################
echo "-> Creating subcategory: Electric (MTB)..."
MTB_E_JSON="$(
  curl -sS -X POST "${BASE}/v1/categories" \
    -H "Content-Type: application/json" \
    -d @- <<JSON
{
  "shop_id": ${SHOP_ID},
  "parent_id": ${CAT_MTB_ID},
  "slug": "electric-mountain-bikes",
  "name": "Electric",
  "description": "Electric-assisted mountain bikes (e-MTB).",
  "is_active": true
}
JSON
)"
echo "Created subcategory: Electric (MTB)"
echo "${MTB_E_JSON}" | jq .
export CAT_MTB_E_ID="$(echo "${MTB_E_JSON}" | jq -r '.id')"

########################################
# Road Bikes + children
########################################

echo "-> Creating Road Bikes root category..."
ROAD_JSON="$(
  curl -sS -X POST "${BASE}/v1/categories" \
    -H "Content-Type: application/json" \
    -d @- <<JSON
{
  "shop_id": ${SHOP_ID},
  "slug": "road-bikes",
  "name": "Road Bikes",
  "description": "Drop-bar bikes for road, race, touring, and city use.",
  "is_active": true
}
JSON
)"
echo "Created root category: Road Bikes"
echo "${ROAD_JSON}" | jq .
export CAT_ROAD_ID="$(echo "${ROAD_JSON}" | jq -r '.id')"

########################################
# Road Race
########################################
echo "-> Creating subcategory: Road Race..."
ROAD_RACE_JSON="$(
  curl -sS -X POST "${BASE}/v1/categories" \
    -H "Content-Type: application/json" \
    -d @- <<JSON
{
  "shop_id": ${SHOP_ID},
  "parent_id": ${CAT_ROAD_ID},
  "slug": "road-race",
  "name": "Road Race",
  "description": "Lightweight race-oriented road bikes.",
  "is_active": true
}
JSON
)"
echo "Created subcategory: Road Race"
echo "${ROAD_RACE_JSON}" | jq .
export CAT_ROAD_RACE_ID="$(echo "${ROAD_RACE_JSON}" | jq -r '.id')"

########################################
# Touring
########################################
echo "-> Creating subcategory: Touring..."
ROAD_TOURING_JSON="$(
  curl -sS -X POST "${BASE}/v1/categories" \
    -H "Content-Type: application/json" \
    -d @- <<JSON
{
  "shop_id": ${SHOP_ID},
  "parent_id": ${CAT_ROAD_ID},
  "slug": "touring",
  "name": "Touring",
  "description": "Comfortable road bikes for long-distance touring.",
  "is_active": true
}
JSON
)"
echo "Created subcategory: Touring"
echo "${ROAD_TOURING_JSON}" | jq .
export CAT_ROAD_TOURING_ID="$(echo "${ROAD_TOURING_JSON}" | jq -r '.id')"

########################################
# Triathlon
########################################
echo "-> Creating subcategory: Triathlon..."
ROAD_TRI_JSON="$(
  curl -sS -X POST "${BASE}/v1/categories" \
    -H "Content-Type: application/json" \
    -d @- <<JSON
{
  "shop_id": ${SHOP_ID},
  "parent_id": ${CAT_ROAD_ID},
  "slug": "triathlon",
  "name": "Triathlon",
  "description": "Triathlon and time-trial specific bikes.",
  "is_active": true
}
JSON
)"
echo "Created subcategory: Triathlon"
echo "${ROAD_TRI_JSON}" | jq .
export CAT_ROAD_TRI_ID="$(echo "${ROAD_TRI_JSON}" | jq -r '.id')"

########################################
# City
########################################
echo "-> Creating subcategory: City..."
ROAD_CITY_JSON="$(
  curl -sS -X POST "${BASE}/v1/categories" \
    -H "Content-Type: application/json" \
    -d @- <<JSON
{
  "shop_id": ${SHOP_ID},
  "parent_id": ${CAT_ROAD_ID},
  "slug": "city-road",
  "name": "City",
  "description": "Road-style bikes optimised for city riding and commuting.",
  "is_active": true
}
JSON
)"
echo "Created subcategory: City"
echo "${ROAD_CITY_JSON}" | jq .
export CAT_ROAD_CITY_ID="$(echo "${ROAD_CITY_JSON}" | jq -r '.id')"

########################################
# Electric Road
########################################
echo "-> Creating subcategory: Electric (Road)..."
ROAD_E_JSON="$(
  curl -sS -X POST "${BASE}/v1/categories" \
    -H "Content-Type: application/json" \
    -d @- <<JSON
{
  "shop_id": ${SHOP_ID},
  "parent_id": ${CAT_ROAD_ID},
  "slug": "electric-road-bikes",
  "name": "Electric",
  "description": "Electric-assisted road and city bikes.",
  "is_active": true
}
JSON
)"
echo "Created subcategory: Electric (Road)"
echo "${ROAD_E_JSON}" | jq .
export CAT_ROAD_E_ID="$(echo "${ROAD_E_JSON}" | jq -r '.id')"

########################################
# Accessories (for add-on products; leaves matched per SKU in dev_seed_accessories.sh)
########################################

echo "-> Creating Accessories root category..."
ACC_ROOT_JSON="$(
  curl -sS -X POST "${BASE}/v1/categories" \
    -H "Content-Type: application/json" \
    -d @- <<JSON
{
  "shop_id": ${SHOP_ID},
  "slug": "accessories",
  "name": "Accessories",
  "description": "Helmets, shoes, tools, and other add-ons.",
  "is_active": true
}
JSON
)"
echo "${ACC_ROOT_JSON}" | jq .
export CAT_ACC_ID="$(echo "${ACC_ROOT_JSON}" | jq -r '.id')"

echo "-> Creating accessory group: Shoes..."
ACC_SHOES_JSON="$(
  curl -sS -X POST "${BASE}/v1/categories" \
    -H "Content-Type: application/json" \
    -d @- <<JSON
{
  "shop_id": ${SHOP_ID},
  "parent_id": ${CAT_ACC_ID},
  "slug": "acc-shoes",
  "name": "Shoes",
  "description": "Road, MTB, and performance cycling footwear.",
  "is_active": true
}
JSON
)"
echo "${ACC_SHOES_JSON}" | jq .
export CAT_ACC_SHOES_ID="$(echo "${ACC_SHOES_JSON}" | jq -r '.id')"

echo "-> Creating accessory group: Helmets..."
ACC_HELMETS_JSON="$(
  curl -sS -X POST "${BASE}/v1/categories" \
    -H "Content-Type: application/json" \
    -d @- <<JSON
{
  "shop_id": ${SHOP_ID},
  "parent_id": ${CAT_ACC_ID},
  "slug": "acc-helmets",
  "name": "Helmets",
  "description": "Road, trail, city, and youth helmets.",
  "is_active": true
}
JSON
)"
echo "${ACC_HELMETS_JSON}" | jq .
export CAT_ACC_HELMETS_GROUP_ID="$(echo "${ACC_HELMETS_JSON}" | jq -r '.id')"

# Shoe and helmet leaves (riding context); pedals / navigation / tools / kids stay under Accessories root.
for pair in \
  "acc-road-shoes:${CAT_ACC_SHOES_ID}:Road shoes:Performance road and tri-oriented cycling shoes" \
  "acc-mtb-shoes:${CAT_ACC_SHOES_ID}:MTB shoes:Trail and all-mountain riding shoes" \
  "acc-road-helmets:${CAT_ACC_HELMETS_GROUP_ID}:Road helmets:Aero and high-ventilation road helmets" \
  "acc-mtb-helmets:${CAT_ACC_HELMETS_GROUP_ID}:Trail helmets:Extended-coverage MTB and enduro helmets" \
  "acc-city-helmets:${CAT_ACC_HELMETS_GROUP_ID}:City & leisure helmets:Comfort-first commuting and fitness helmets" \
  "acc-youth-helmets:${CAT_ACC_HELMETS_GROUP_ID}:Youth helmets:Smaller-fit helmets for younger riders" \
  "acc-pedals:${CAT_ACC_ID}:Pedals:Platform and clip-in pedals" \
  "acc-navigation:${CAT_ACC_ID}:Navigation:Mounts and cockpit navigation accessories" \
  "acc-tools:${CAT_ACC_ID}:Tools:Tool kits and ride essentials" \
  "acc-kids:${CAT_ACC_ID}:Kids:Youth protection and starter bundles"; do
  slug="${pair%%:*}"
  rest="${pair#*:}"
  parent_id="${rest%%:*}"
  rest2="${rest#*:}"
  name="${rest2%%:*}"
  desc="${rest2#*:}"
  echo "-> Creating accessory subcategory: ${name}..."
  sub_json="$(
    curl -sS -X POST "${BASE}/v1/categories" \
      -H "Content-Type: application/json" \
      -d @- <<JSON
{
  "shop_id": ${SHOP_ID},
  "parent_id": ${parent_id},
  "slug": "${slug}",
  "name": "${name}",
  "description": "${desc}",
  "is_active": true
}
JSON
  )"
  echo "${sub_json}" | jq .
done

echo "==> Category seeding finished 🎉"
