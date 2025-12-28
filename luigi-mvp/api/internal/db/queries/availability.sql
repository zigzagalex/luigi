-- Count how many inventory items of a given variant+store
-- are available for a requested time range.
--
-- Requested range is built as [start_at, end_at)
-- and we exclude items that are:
--   - in maintenance_windows
--   - in (non-cancelled) reservations via reservation_items.padded_range
--   - in non-expired holds
-- name: CountAvailableInventoryForRange :one
WITH candidate_items AS (
  SELECT ii.id
  FROM inventory_items ii
  WHERE ii.product_variant_id = sqlc.arg(product_variant_id)
    AND ii.store_id = sqlc.arg(store_id)
    AND ii.is_active = TRUE
    AND (ii.status IS NULL OR ii.status = 'active')
),
requested AS (
  SELECT tstzrange(
           sqlc.arg(start_at),
           sqlc.arg(end_at),
           '[)'
         ) AS r
),
blocked_by_maintenance AS (
  SELECT DISTINCT mw.inventory_item_id
  FROM maintenance_windows mw, requested
  WHERE mw.inventory_item_id IN (SELECT id FROM candidate_items)
    AND mw.time_range && requested.r
),
blocked_by_reservations AS (
  SELECT DISTINCT ri.inventory_item_id
  FROM reservation_items ri
  JOIN reservations rsv ON rsv.id = ri.reservation_id,
       requested
  WHERE ri.inventory_item_id IN (SELECT id FROM candidate_items)
    AND ri.padded_range && requested.r
    AND rsv.status NOT IN ('draft', 'returned', 'cancelled', 'expired', 'closed')
),
blocked_by_holds AS (
  SELECT DISTINCT h.inventory_item_id
  FROM holds h, requested
  WHERE h.inventory_item_id IN (SELECT id FROM candidate_items)
    AND h.hold_range && requested.r
    AND h.expires_at > now()
),
blocked AS (
  SELECT inventory_item_id AS id FROM blocked_by_maintenance
  UNION
  SELECT inventory_item_id AS id FROM blocked_by_reservations
  UNION
  SELECT inventory_item_id AS id FROM blocked_by_holds
)
SELECT COUNT(*)::int4 AS available_count
FROM candidate_items c
LEFT JOIN blocked b ON b.id = c.id
WHERE b.id IS NULL;


-- List active inventory items for a given variant+store.
-- name: ListActiveInventoryForVariantStore :many
SELECT
  id,
  shop_id,
  product_variant_id,
  store_id,
  tag_code,
  serial_number,
  status,
  service_padding_before,
  service_padding_after,
  is_active,
  created_at,
  updated_at
FROM inventory_items
WHERE product_variant_id = sqlc.arg(product_variant_id)
  AND store_id = sqlc.arg(store_id)
  AND is_active = TRUE
  AND (status IS NULL OR status = 'active')
ORDER BY id;

-- name: GetPriceCategoryForVariant :one
SELECT p.price_category
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
WHERE pv.id = sqlc.arg(product_variant_id);

-- Search available variants across products / stores for a given time range.
-- Filters:
--   - shop_id        (optional)
--   - store_id       (optional)
--   - product_ids    (optional array)
--   - category_ids   (optional array)
--   - start_at, end_at  (required, full reservation window)
--   - quantity       (required, minimum units needed)
-- Returns one row per (product, variant, store) that has COUNT(*) >= quantity.
-- name: SearchAvailableVariants :many
WITH candidate_items AS (
  SELECT DISTINCT
    ii.id,
    ii.product_variant_id,
    ii.store_id,
    p.id      AS product_id,
    p.shop_id AS shop_id
  FROM inventory_items ii
  JOIN product_variants pv ON pv.id = ii.product_variant_id
  JOIN products p          ON p.id = pv.product_id
  LEFT JOIN product_category_assignments pca
         ON pca.product_id = p.id
  WHERE
    -- only active inventory
    ii.is_active = TRUE
    AND (ii.status IS NULL OR ii.status = 'active')

    -- optional filters
    AND (
      sqlc.narg(shop_id)::bigint IS NULL
      OR ii.shop_id = sqlc.narg(shop_id)::bigint
    )
    AND (
      sqlc.narg(store_id)::bigint IS NULL
      OR ii.store_id = sqlc.narg(store_id)::bigint
    )
    AND (
      sqlc.narg(product_ids)::bigint[] IS NULL
      OR p.id = ANY(sqlc.narg(product_ids))
    )
    AND (
      sqlc.narg(category_ids)::bigint[] IS NULL
      OR pca.category_id = ANY(sqlc.narg(category_ids))
    )
),
range_param AS (
  SELECT tstzrange(sqlc.arg(start_at), sqlc.arg(end_at), '[)') AS desired_range
),
blocked_reservations AS (
  SELECT DISTINCT ri.inventory_item_id
  FROM reservation_items ri
  JOIN reservations r ON r.id = ri.reservation_id
  CROSS JOIN range_param rp
  WHERE
    r.status NOT IN ('draft', 'returned', 'cancelled', 'expired', 'closed')
    AND ri.padded_range && rp.desired_range
),
blocked_holds AS (
  SELECT DISTINCT h.inventory_item_id
  FROM holds h
  CROSS JOIN range_param rp
  WHERE
    -- only non-expired holds matter
    h.expires_at > now()
    AND h.hold_range && rp.desired_range
),
blocked_maintenance AS (
  SELECT DISTINCT mw.inventory_item_id
  FROM maintenance_windows mw
  CROSS JOIN range_param rp
  WHERE
    mw.time_range && rp.desired_range
)
SELECT
  ci.product_id,
  ci.shop_id,
  ci.product_variant_id,
  ci.store_id,
  COUNT(*) AS available_quantity
FROM candidate_items ci
LEFT JOIN blocked_reservations br ON br.inventory_item_id = ci.id
LEFT JOIN blocked_holds        bh ON bh.inventory_item_id = ci.id
LEFT JOIN blocked_maintenance  bm ON bm.inventory_item_id = ci.id
WHERE
  br.inventory_item_id IS NULL
  AND bh.inventory_item_id IS NULL
  AND bm.inventory_item_id IS NULL
GROUP BY
  ci.product_id,
  ci.shop_id,
  ci.product_variant_id,
  ci.store_id
HAVING
  COUNT(*) >= sqlc.arg(quantity);
