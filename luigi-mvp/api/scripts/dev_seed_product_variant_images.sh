#!/usr/bin/env bash
set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-luigi-postgres-dev}"

echo "==> Seeding bike images (web-shop/public/media/Bikes) inside container '$CONTAINER'"

# Maps each seeded bike SKU (dev_seed_products.sh) -> files under public/media/Bikes/.
# Rows are attached only to the first variant per product (created_at, id); the shop UI
# reuses those images for sibling variants via fallback. Accessory rows are untouched.
#
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
          'media/Bikes/Standard/Hardtail/91325-50_EPIC-HT-COMP-RBLPNK-OBSD-BRSH_HERO-PDP.webp',
          'media/Bikes/Standard/Hardtail/91325-50_EPIC-HT-COMP-RBLPNK-OBSD-BRSH_FDSQ.webp'
        ]::text[]
        WHEN 'STD-MTB-TRAIL-2' THEN ARRAY[
          'media/Bikes/Standard/Fully/93325-76_SJ-15-ALLOY-WHTMTN-DKMOS_HERO-PDP.webp',
          'media/Bikes/Standard/Fully/93325-76_SJ-15-ALLOY-WHTMTN-DKMOS_FDSQ.webp'
        ]::text[]
        WHEN 'STD-RD-END-1' THEN ARRAY[
          'media/Bikes/Standard/Endurance/94426-61_ROUBAIX-SPORT-FLORED-OBSD_HERO-PDP.webp',
          'media/Bikes/Standard/Endurance/94426-61_ROUBAIX-SPORT-FLORED-OBSD_FDSQ.webp'
        ]::text[]
        WHEN 'STD-RD-END-2' THEN ARRAY[
          'media/Bikes/Standard/Endurance/94426-61_ROUBAIX-SPORT-FLORED-OBSD_FDSQ.webp',
          'media/Bikes/Standard/Endurance/94426-61_ROUBAIX-SPORT-FLORED-OBSD_HERO-PDP.webp'
        ]::text[]
        WHEN 'STD-RD-CITY-1' THEN ARRAY[
          'media/Bikes/Standard/City/92426-32_SIRRUS-X-60-FJDMET-EMDMET_HERO-PDP.webp',
          'media/Bikes/Standard/City/92426-32_SIRRUS-X-60-FJDMET-EMDMET_FDSQ.webp'
        ]::text[]
        WHEN 'PRO-MTB-END-1' THEN ARRAY[
          'media/Bikes/Pro/Fully/93326-31_SJ-15-EXPERT-DI2-PST-DKMOS_HERO-PDP.webp',
          'media/Bikes/Pro/Fully/93326-31_SJ-15-EXPERT-DI2-PST-DKMOS_FDSQ.webp'
        ]::text[]
        WHEN 'PRO-MTB-DH-1' THEN ARRAY[
          'media/Bikes/Pro/Hardtail/93125-03_EPIC-WC-SW-GCLMET-CARB-CHRM_HERO-PDP.webp',
          'media/Bikes/Pro/Hardtail/93125-03_EPIC-WC-SW-GCLMET-CARB-CHRM_FDSQ.webp',
          'media/Bikes/Pro/Hardtail/93125-03_EPIC-WC-SW-GCLMET-CARB-CHRM_D6-LINK.webp'
        ]::text[]
        WHEN 'PRO-RD-RACE-1' THEN ARRAY[
          'media/Bikes/Pro/Endurance/94425-01_ROUBAIX-SW-DI2-TPE-GUN-BLKTNT_HERO-PDP.webp',
          'media/Bikes/Pro/Endurance/94425-01_ROUBAIX-SW-DI2-TPE-GUN-BLKTNT_FDSQ.webp'
        ]::text[]
        WHEN 'PRO-RD-AERO-1' THEN ARRAY[
          'media/Bikes/Pro/Endurance/94425-01_ROUBAIX-SW-DI2-TPE-GUN-BLKTNT_FDSQ.webp',
          'media/Bikes/Pro/Endurance/94425-01_ROUBAIX-SW-DI2-TPE-GUN-BLKTNT_HERO-PDP.webp'
        ]::text[]
        WHEN 'PRO-RD-GRVL-1' THEN ARRAY[
          'media/Bikes/Pro/Gravel/95426-10_DIVERGE-PRO-BDXMET-REDPRL-DLMMET_HERO-PDP.webp',
          'media/Bikes/Pro/Gravel/95426-10_DIVERGE-PRO-BDXMET-REDPRL-DLMMET_FDSQ.webp'
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
