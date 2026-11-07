#!/usr/bin/env bash
set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-luigi-postgres-dev}"

echo "==> Seeding bike images (web-shop/public/media/Bikes) inside container '$CONTAINER'"

# Maps each seeded bike SKU (dev_seed_products.sh) -> files under public/media/Bikes/.
# Rows are attached only to the first variant per product (created_at, id); the shop UI
# reuses those images for sibling variants via fallback. Accessory rows are untouched.
#
# First array element = primary (list cards + is_primary); we prefer *_FDSQ.webp over *_HERO-PDP.webp.
# To swap photos, edit the CASE below or add files under public/media/Bikes/... and keys here.
SQL=$(cat <<'EOSQL'
DELETE FROM product_variant_images
WHERE product_variant_id IN (
  SELECT pv.id
  FROM product_variants pv
  INNER JOIN products p ON p.id = pv.product_id
  WHERE COALESCE(p.is_accessory, false) = false
);

WITH first_bike_variant AS (
  SELECT DISTINCT ON (p.id)
    pv.id AS variant_id,
    p.sku
  FROM product_variants pv
  INNER JOIN products p ON p.id = pv.product_id
  WHERE COALESCE(p.is_accessory, false) = false
  ORDER BY p.id, pv.created_at ASC, pv.id ASC
),
imgs AS (
  SELECT
    fb.variant_id,
    u.object_key,
    (u.ord - 1)::int AS sort_order,
    (u.ord = 1) AS is_primary
  FROM first_bike_variant fb
  CROSS JOIN LATERAL (
    SELECT t.object_key, t.ord
    FROM unnest(
      CASE trim(both from fb.sku)
        WHEN 'STD-MTB-TRAIL-1' THEN ARRAY[
          'media/Bikes/Standard/Hardtail/placeholder-std-hardtail-side-v3.jpg',
          'media/Bikes/Standard/Hardtail/placeholder-std-hardtail-angle-v3.jpg'
        ]::text[]
        WHEN 'STD-MTB-TRAIL-2' THEN ARRAY[
          'media/Bikes/Standard/Fully/placeholder-std-fullsus-side-v3.jpg',
          'media/Bikes/Standard/Fully/placeholder-std-fullsus-angle-v3.jpg'
        ]::text[]
        WHEN 'STD-RD-END-1' THEN ARRAY[
          'media/Bikes/Standard/Endurance/placeholder-std-endurance-side-v3.jpg',
          'media/Bikes/Standard/Endurance/placeholder-std-endurance-angle-v3.jpg'
        ]::text[]
        WHEN 'STD-RD-END-2' THEN ARRAY[
          'media/Bikes/Standard/Endurance/placeholder-std-comfort-side-v3.jpg',
          'media/Bikes/Standard/Endurance/placeholder-std-comfort-angle-v3.jpg'
        ]::text[]
        WHEN 'STD-RD-CITY-1' THEN ARRAY[
          'media/Bikes/Standard/City/placeholder-std-city-side-v3.jpg',
          'media/Bikes/Standard/City/placeholder-std-city-angle-v3.jpg'
        ]::text[]
        WHEN 'PRO-MTB-END-1' THEN ARRAY[
          'media/Bikes/Pro/Fully/placeholder-pro-enduro-side-v3.jpg',
          'media/Bikes/Pro/Fully/placeholder-pro-enduro-angle-v3.jpg'
        ]::text[]
        WHEN 'PRO-MTB-DH-1' THEN ARRAY[
          'media/Bikes/Pro/Downhill/placeholder-pro-downhill-side-v3.jpg',
          'media/Bikes/Pro/Downhill/placeholder-pro-downhill-angle-v3.jpg'
        ]::text[]
        WHEN 'PRO-RD-RACE-1' THEN ARRAY[
          'media/Bikes/Pro/Endurance/placeholder-pro-race-side-v3.jpg',
          'media/Bikes/Pro/Endurance/placeholder-pro-race-angle-v3.jpg'
        ]::text[]
        WHEN 'PRO-RD-AERO-1' THEN ARRAY[
          'media/Bikes/Pro/Aero/placeholder-pro-aero-side-v3.jpg',
          'media/Bikes/Pro/Aero/placeholder-pro-aero-angle-v3.jpg'
        ]::text[]
        WHEN 'PRO-RD-GRVL-1' THEN ARRAY[
          'media/Bikes/Pro/Gravel/placeholder-pro-gravel-side-v3.jpg',
          'media/Bikes/Pro/Gravel/placeholder-pro-gravel-angle-v3.jpg'
        ]::text[]
        ELSE ARRAY[]::text[]
      END
    ) WITH ORDINALITY AS t(object_key, ord)
  ) u
)
INSERT INTO product_variant_images (
  product_variant_id,
  object_key,
  sort_order,
  is_primary,
  alt_text,
  width_px,
  height_px
)
SELECT
  variant_id,
  object_key,
  sort_order,
  is_primary,
  NULL::text,
  NULL::int,
  NULL::int
FROM imgs
ORDER BY variant_id, sort_order;
EOSQL
)

# Run psql *inside* the postgres container, using its POSTGRES_* env
docker exec -i "$CONTAINER" sh -c '
  set -eu
  # Use the container’s own POSTGRES_* env vars for auth
  export PGPASSWORD="$POSTGRES_PASSWORD"
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
' <<< "$SQL"

echo "==> Done. Sample rows:"
docker exec -i "$CONTAINER" sh -c '
  set -eu
  export PGPASSWORD="$POSTGRES_PASSWORD"
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
    SELECT product_variant_id, object_key, sort_order, is_primary
    FROM product_variant_images
    ORDER BY product_variant_id, sort_order
    LIMIT 30;
  "
'

# Object keys are paths under web-shop/public (media/Bikes/...). Put those
# bytes in the bucket so the shop URL MEDIA_BASE_URL + key resolves.
MEDIA_DIR="${SCRIPT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}/../../web-shop/public/media"
API_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "==> Uploading ${MEDIA_DIR} to S3 (keys media/...)"
(
  cd "${API_DIR}"
  go run ./cmd/seedmedia -dir "${MEDIA_DIR}"
)
