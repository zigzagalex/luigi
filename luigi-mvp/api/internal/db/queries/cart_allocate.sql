-- name: AllocateInventoryItemsForHold :many
SELECT ii.id
FROM inventory_items ii
WHERE ii.product_variant_id = sqlc.arg(product_variant_id)
  AND ii.store_id = sqlc.arg(store_id)
  AND (ii.is_active IS NULL OR ii.is_active = TRUE)
  AND (ii.status IS NULL OR ii.status = 'active')

  AND NOT EXISTS (
    SELECT 1
    FROM holds h
    WHERE h.inventory_item_id = ii.id
      AND h.hold_range && tstzrange(sqlc.arg(start_at), sqlc.arg(end_at), '[)')
      AND h.expires_at > now()
  )

  AND NOT EXISTS (
    SELECT 1
    FROM maintenance_windows mw
    WHERE mw.inventory_item_id = ii.id
      AND mw.time_range && tstzrange(sqlc.arg(start_at), sqlc.arg(end_at), '[)')
  )

ORDER BY ii.id
LIMIT sqlc.arg(limit_n);
