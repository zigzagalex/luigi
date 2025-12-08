#!/usr/bin/env bash
set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-luigi-postgres-dev}"

echo "==> Reseeding placeholder images inside container '$CONTAINER'"

# This SQL:
# - wipes product_variant_images
# - inserts 6 images per variant (3 black + 3 blue)
SQL=$(cat <<'EOSQL'
TRUNCATE product_variant_images RESTART IDENTITY;

WITH v AS (
  SELECT
    pv.id AS variant_id,
    LOWER(COALESCE(pv.attributes->>'color', 'black')) AS color
  FROM product_variants pv
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
  v.variant_id,
  CASE
    WHEN v.color = 'blue' THEN
      'media/placeholders/blue/blue-' || img_idx || '.png'
    ELSE
      'media/placeholders/black/black-' || img_idx || '.png'
  END AS object_key,
  img_idx AS sort_order,
  (img_idx = 1) AS is_primary,
  NULL::text AS alt_text,
  NULL::int AS width_px,
  NULL::int AS height_px
FROM v
CROSS JOIN generate_series(1, 3) AS img_idx
ORDER BY v.variant_id, img_idx;
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
