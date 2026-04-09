-- name: ListAccessoryInventoryItems :many
SELECT
  id,
  shop_id,
  accessory_variant_id,
  store_id,
  tag_code,
  serial_number,
  status,
  service_padding_before,
  service_padding_after,
  is_active,
  created_at,
  updated_at
FROM accessory_inventory_items
WHERE (
  sqlc.narg(shop_id)::bigint IS NULL
  OR shop_id = sqlc.narg(shop_id)::bigint
)
AND (
  sqlc.narg(accessory_variant_id)::bigint IS NULL
  OR accessory_variant_id = sqlc.narg(accessory_variant_id)::bigint
)
ORDER BY id
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CreateAccessoryInventoryItem :one
INSERT INTO accessory_inventory_items (
  shop_id,
  accessory_variant_id,
  store_id,
  tag_code,
  serial_number,
  status,
  service_padding_before,
  service_padding_after,
  is_active
) VALUES (
  sqlc.arg(shop_id),
  sqlc.arg(accessory_variant_id),
  sqlc.arg(store_id),
  sqlc.narg(tag_code)::text,
  sqlc.narg(serial_number)::text,
  COALESCE(sqlc.narg(status)::text, 'active'),
  COALESCE(sqlc.narg(service_padding_before)::text::interval, INTERVAL '0 minutes'),
  COALESCE(sqlc.narg(service_padding_after)::text::interval,  INTERVAL '0 minutes'),
  COALESCE(sqlc.narg(is_active)::bool, TRUE)
)
RETURNING
  id,
  shop_id,
  accessory_variant_id,
  store_id,
  tag_code,
  serial_number,
  status,
  service_padding_before,
  service_padding_after,
  is_active,
  created_at,
  updated_at;

-- name: UpdateAccessoryInventoryItem :one
UPDATE accessory_inventory_items
SET
  tag_code               = COALESCE(sqlc.narg(tag_code)::text, tag_code),
  serial_number          = COALESCE(sqlc.narg(serial_number)::text, serial_number),
  status                 = COALESCE(sqlc.narg(status)::text, status),
  service_padding_before = COALESCE(sqlc.narg(service_padding_before)::text::interval, service_padding_before),
  service_padding_after  = COALESCE(sqlc.narg(service_padding_after)::text::interval, service_padding_after),
  is_active              = COALESCE(sqlc.narg(is_active)::bool, is_active),
  updated_at             = now()
WHERE id = sqlc.arg(id)
RETURNING
  id,
  shop_id,
  accessory_variant_id,
  store_id,
  tag_code,
  serial_number,
  status,
  service_padding_before,
  service_padding_after,
  is_active,
  created_at,
  updated_at;

-- name: DeleteAccessoryInventoryItem :one
DELETE FROM accessory_inventory_items
WHERE id = sqlc.arg(id)
RETURNING
  id,
  shop_id,
  accessory_variant_id,
  store_id,
  tag_code,
  serial_number,
  status,
  service_padding_before,
  service_padding_after,
  is_active,
  created_at,
  updated_at;
