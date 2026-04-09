#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
SHOP_ID="${SHOP_ID:-1}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEDIA_ROOT="${MEDIA_ROOT:-${SCRIPT_DIR}/../../web-shop/public/media/Accessories}"

echo "==> Seeding accessories + accessory variants"
echo "    API: ${API_BASE_URL}"
echo "    SHOP_ID: ${SHOP_ID}"
echo "    MEDIA_ROOT: ${MEDIA_ROOT}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command '$1' not found. Install it first." >&2
    exit 1
  fi
}

require_cmd curl
require_cmd jq

if [ ! -d "${MEDIA_ROOT}" ]; then
  echo "Error: media folder not found at '${MEDIA_ROOT}'" >&2
  exit 1
fi

echo "-> Checking API health..."
if ! curl -sSf "${API_BASE_URL}/health" >/dev/null 2>&1; then
  echo "Error: API health check failed at ${API_BASE_URL}/health" >&2
  exit 1
fi
echo "   API is up ✅"

shopt -s nullglob

json_escape() {
  jq -Rn --arg v "$1" '$v'
}

find_accessory_id_by_sku() {
  local sku="$1"
  curl -sS "${API_BASE_URL}/v1/accessories?shop_id=${SHOP_ID}&limit=500&offset=0" \
    | jq -r --arg sku "$sku" '.[] | select(.sku == $sku) | .id' \
    | head -n1
}

create_accessory() {
  local sku="$1"
  local name="$2"
  local description="$3"

  local resp
  resp="$(
    curl -sS -X POST "${API_BASE_URL}/v1/accessories" \
      -H "Content-Type: application/json" \
      -d @- <<JSON
{
  "shop_id": ${SHOP_ID},
  "sku": $(json_escape "$sku"),
  "name": $(json_escape "$name"),
  "description": $(json_escape "$description"),
  "is_active": true
}
JSON
  )"

  echo "$resp" | jq -r '.id'
}

upsert_accessory_translation_en() {
  local accessory_id="$1"
  local name="$2"
  local description="$3"
  local detailed_description="$4"

  curl -sS -X PUT "${API_BASE_URL}/v1/accessories/${accessory_id}/translations/en" \
    -H "Content-Type: application/json" \
    -d @- <<JSON >/dev/null
{
  "name": $(json_escape "$name"),
  "description": $(json_escape "$description"),
  "detailed_description": $(json_escape "$detailed_description")
}
JSON
}

find_variant_id() {
  local accessory_id="$1"
  local label="$2"

  curl -sS "${API_BASE_URL}/v1/accessory_variants?accessory_id=${accessory_id}&limit=500&offset=0" \
    | jq -r --arg label "$label" '.[] | select(.label == $label) | .id' \
    | head -n1
}

create_variant() {
  local accessory_id="$1"
  local label="$2"
  local attributes_json="$3"

  local resp
  resp="$(
    curl -sS -X POST "${API_BASE_URL}/v1/accessory_variants" \
      -H "Content-Type: application/json" \
      -d @- <<JSON
{
  "accessory_id": ${accessory_id},
  "label": $(json_escape "$label"),
  "attributes": ${attributes_json},
  "is_active": true
}
JSON
  )"

  echo "$resp" | jq -r '.id'
}

upload_variant_images_once() {
  local variant_id="$1"
  shift
  local image_paths=("$@")

  local existing_count
  existing_count="$(
    curl -sS "${API_BASE_URL}/v1/accessory_variants/${variant_id}/images" | jq 'length'
  )"

  if [ "${existing_count}" -gt 0 ]; then
    echo "      images already exist for variant ${variant_id}, skipping upload"
    return
  fi

  if [ "${#image_paths[@]}" -eq 0 ]; then
    echo "      no local images found for variant ${variant_id}, skipping upload"
    return
  fi

  local path
  for path in "${image_paths[@]}"; do
    if [ -f "${path}" ]; then
      echo "      upload image -> $(basename "${path}")"
      curl -sS -X POST "${API_BASE_URL}/v1/accessory_variants/${variant_id}/images" \
        -F "file=@${path}" >/dev/null
    fi
  done
}

seed_accessory() {
  local sku="$1"
  local name="$2"
  local short_description="$3"
  local detailed_description="$4"
  local variant_mode="$5"  # shoes | helmets | default
  shift 5
  local image_paths=("$@")

  echo "-> ${name} (${sku})"

  local accessory_id
  accessory_id="$(find_accessory_id_by_sku "$sku")"
  if [ -z "${accessory_id}" ]; then
    accessory_id="$(create_accessory "$sku" "$name" "$short_description")"
    echo "   created accessory id=${accessory_id}"
  else
    echo "   accessory exists id=${accessory_id}"
  fi

  upsert_accessory_translation_en "${accessory_id}" "${name}" "${short_description}" "${detailed_description}"

  local labels=()
  local attrs=()
  case "${variant_mode}" in
    shoes)
      labels=("EU 39" "EU 40" "EU 41" "EU 42" "EU 43" "EU 44")
      attrs=(
        '{"size_eu":"39","category":"shoes"}'
        '{"size_eu":"40","category":"shoes"}'
        '{"size_eu":"41","category":"shoes"}'
        '{"size_eu":"42","category":"shoes"}'
        '{"size_eu":"43","category":"shoes"}'
        '{"size_eu":"44","category":"shoes"}'
      )
      ;;
    helmets)
      labels=("Size S" "Size M" "Size L")
      attrs=(
        '{"size":"S","category":"helmet"}'
        '{"size":"M","category":"helmet"}'
        '{"size":"L","category":"helmet"}'
      )
      ;;
    *)
      labels=("Standard")
      attrs=('{"option":"default"}')
      ;;
  esac

  local i
  for i in "${!labels[@]}"; do
    local label="${labels[$i]}"
    local attr_json="${attrs[$i]}"

    local variant_id
    variant_id="$(find_variant_id "${accessory_id}" "${label}")"
    if [ -z "${variant_id}" ]; then
      variant_id="$(create_variant "${accessory_id}" "${label}" "${attr_json}")"
      echo "   created variant '${label}' id=${variant_id}"
    else
      echo "   variant '${label}' exists id=${variant_id}"
    fi

    upload_variant_images_once "${variant_id}" "${image_paths[@]}"
  done
}

# Accessories inferred from folder + filename tokens in:
# web-shop/public/media/Accessories/{Shoes,Helmets,Pedals,Navigation,Tools,Kids}

seed_accessory \
  "ACC-SHOE-RECON-30" \
  "Recon 3.0 MTB Shoes" \
  "Trail-focused cycling shoes with stable power transfer and all-day comfort." \
  "The Recon 3.0 is designed for riders who need efficient pedaling and confident off-bike traction.\n\n- Stiff sole to transfer power on climbs and sprints\n- Reinforced toe area for rocky terrain\n- Secure closure for a precise fit\n- Breathable upper for warm-weather rides\n- Durable outsole suitable for hike-a-bike sections\n\nIdeal for: mountain biking, mixed terrain rides, and long trail days." \
  "shoes" \
  "${MEDIA_ROOT}/Shoes/61524-3042_SHOE_24_RECON_30_Black_HERO.webp" \
  "${MEDIA_ROOT}/Shoes/61524-3042_SHOE_24_RECON_30_Black_PAIR.webp"

seed_accessory \
  "ACC-SHOE-TORCH-RD" \
  "Torch Road Shoes" \
  "Performance road cycling shoes built for efficient pedaling and secure fit." \
  "Torch Road Shoes are tuned for road riders who want a responsive feel and reliable comfort over long hours.\n\n- Stiff sole for efficient watt transfer\n- Ergonomic closure for pressure-free hold\n- Ventilated upper for airflow at high intensity\n- Stable heel cup for confident accelerations\n- Durable construction for regular training use\n\nIdeal for: road training, fast group rides, and sportive events." \
  "shoes" \
  "${MEDIA_ROOT}/Shoes/61026-003_SHOE_SW-TORCH-RD-SHOE-FRYRED-BLK_HERO-PDP.webp" \
  "${MEDIA_ROOT}/Shoes/61026-003_SHOE_SW-TORCH-RD-SHOE-FRYRED-BLK_PAIR.webp"

seed_accessory \
  "ACC-SHOE-RIME-MTB" \
  "Rime 2.0 MTB Shoes" \
  "All-mountain shoes that balance pedaling efficiency and walkable grip." \
  "Rime 2.0 MTB Shoes are built for riders who climb, descend, and occasionally hike technical sections.\n\n- Balanced stiffness for pedaling and comfort\n- Grippy outsole for wet rocks and loose dirt\n- Protective upper for rough trail conditions\n- Secure fit to reduce foot movement on descents\n- Breathable design for all-day adventures\n\nIdeal for: trail riding, enduro days, and mountain adventures." \
  "shoes" \
  "${MEDIA_ROOT}/Shoes/61119-734_SHOE_RIME-20-MTB_BLK_HERO.webp" \
  "${MEDIA_ROOT}/Shoes/61119-734_SHOE_RIME-20-MTB_BLK_PAIR.webp"

seed_accessory \
  "ACC-HLMT-MIO-2" \
  "Mio 2 Helmet" \
  "Lightweight youth-oriented helmet focused on comfort and everyday protection." \
  "The Mio 2 Helmet is designed for younger riders and smaller head sizes, with ventilation and a stable fit.\n\n- Protective shell with modern impact standards\n- Easy adjustment dial for quick fit tuning\n- Vent layout for daily comfort\n- Lightweight construction for reduced neck fatigue\n- Clean design suitable for city and recreational riding\n\nIdeal for: daily rides, school commutes, and beginner cyclists." \
  "helmets" \
  "${MEDIA_ROOT}/Helmets/60025-441_HLMT_MIO-2-HLMT-CE-DUNEWHTOIS_HERO-PDP.webp"

seed_accessory \
  "ACC-HLMT-PREVAIL-3" \
  "S-Works Prevail 3 Helmet" \
  "High-ventilation performance helmet optimized for warm conditions and hard efforts." \
  "S-Works Prevail 3 is built for riders who prioritize airflow and low weight without compromising safety.\n\n- Advanced ventilation channels for cooling\n- Aerodynamic profile for high-speed riding\n- Lightweight in-mold construction\n- Precision retention system for race-ready fit\n- Compatible shape for modern road positions\n\nIdeal for: road racing, fast group rides, and summer training blocks." \
  "helmets" \
  "${MEDIA_ROOT}/Helmets/60923-100_HLMT_SW-PREVAIL-3-HLMT-CE-BLK-M_HERO.webp"

seed_accessory \
  "ACC-HLMT-TRAIL-65" \
  "Trail 65 Helmet" \
  "Versatile trail helmet with extended coverage for off-road confidence." \
  "The Trail 65 Helmet offers dependable protection and all-day comfort for mountain and gravel riders.\n\n- Extended rear coverage for trail riding\n- Ventilation designed for low-speed climbs and technical descents\n- Secure fit system for rough terrain\n- Durable shell finish for regular use\n- Balanced weight for long sessions\n\nIdeal for: trail riding, bike parks, and mixed-surface adventures." \
  "helmets" \
  "${MEDIA_ROOT}/Helmets/60222-193_HLMT_65-TRAIL-HLMT-CE-COLOR-3-M_HERO.webp"

seed_accessory \
  "ACC-HLMT-CHAMONIX-3" \
  "Chamonix 3 Helmet" \
  "Comfort-first all-round helmet suitable for commuting and leisure rides." \
  "Chamonix 3 is a reliable everyday helmet with easy fit adjustment and broad riding versatility.\n\n- Protective design with practical everyday coverage\n- User-friendly rear adjustment system\n- Ventilation for urban and weekend riding\n- Compatible shape for casual and fitness use\n- Durable shell for frequent handling\n\nIdeal for: city commuting, weekend loops, and fitness cycling." \
  "helmets" \
  "${MEDIA_ROOT}/Helmets/60125-180_HLMT_CHAMONIX-3-HLMT_VISOR-CE-HYPERVIZ-ROUND_HERO (1).webp"

seed_accessory \
  "ACC-PEDAL-TRAIL-FLAT" \
  "Trail Flat Pedals" \
  "Wide-platform pedals with consistent grip for control on technical terrain." \
  "Trail Flat Pedals prioritize stability and confidence for riders who prefer flat-shoe control.\n\n- Large contact platform for better foot support\n- Serviceable axle and bearing setup\n- Pin layout tuned for reliable grip\n- Durable body for repeated trail impacts\n- Balanced profile for cornering clearance\n\nIdeal for: trail bikes, enduro riding, and all-mountain setups." \
  "default" \
  "${MEDIA_ROOT}/Pedals/d7cb3fb9-b10e-4055-af9c-1b0a3fe363bc.jpeg" \
  "${MEDIA_ROOT}/Pedals/62270f66-461c-49b4-9383-d713794c664a.jpeg" \
  "${MEDIA_ROOT}/Pedals/a225b095-6b37-4e6b-b26e-f01d7a62a84f.jpeg"

seed_accessory \
  "ACC-NAV-HANDLEBAR-MOUNT" \
  "Handlebar Navigation Mount" \
  "Compact cockpit mount for phones and GPS units on road or gravel bikes." \
  "This handlebar navigation mount keeps your route information centered and easy to read.\n\n- Stable clamp interface for rough surfaces\n- Low-profile design to keep cockpit clean\n- Quick install and adjustment\n- Broad compatibility with common handlebar diameters\n- Vibration-resistant setup for better readability\n\nIdeal for: touring, gravel exploration, and long route planning rides." \
  "default" \
  "${MEDIA_ROOT}/Navigation/6eeff327-5350-4348-9116-4884806dfd2f.jpeg"

seed_accessory \
  "ACC-TOOLS-ESSENTIAL-KIT" \
  "Essential Ride Tool Kit" \
  "Portable tool bundle for roadside adjustments and common bike fixes." \
  "Essential Ride Tool Kit covers the most frequent mid-ride adjustments in a compact package.\n\n- Multi-tool core for fit and drivetrain tweaks\n- Compact form factor for jersey pocket or saddle bag\n- Durable metal tools for repeated use\n- Organized layout for quick access\n- Built for emergency and preventive maintenance\n\nIdeal for: training rides, commuting, and bikepacking carry." \
  "default" \
  "${MEDIA_ROOT}/Tools/ce5e7c87-2b6e-4a40-8431-f4c4c2bcf6ff.jpeg" \
  "${MEDIA_ROOT}/Tools/5ec91be9-a75e-411b-bfa5-c335a44b0bf9.jpeg"

seed_accessory \
  "ACC-KIDS-STARTER-PROTECTION" \
  "Kids Starter Protection Set" \
  "Beginner-friendly protective accessory set sized for young riders." \
  "Kids Starter Protection Set is made to help children ride with confidence and comfort from day one.\n\n- Soft-contact materials for comfortable wear\n- Adjustable closures to support growth and fit\n- Lightweight construction for easy movement\n- Durable build for repeated daily use\n- Simple setup for parents and instructors\n\nIdeal for: first rides, family cycling days, and youth training sessions." \
  "default" \
  "${MEDIA_ROOT}/Kids/a4b29729-4287-4b43-b6fd-b72d8b95253a.jpeg"

echo "==> Accessory + variant seeding finished 🎉"
echo "    Note: no product-accessory links were created."
