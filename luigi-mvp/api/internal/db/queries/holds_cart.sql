-- name: ListHoldsByCartItem :many
SELECT *
FROM holds
WHERE cart_item_id = sqlc.arg(cart_item_id)
ORDER BY id ASC;

-- name: DeleteHoldsByCartItem :exec
DELETE FROM holds
WHERE cart_item_id = sqlc.arg(cart_item_id)::bigint;

-- name: CreateHoldForCartItem :one
INSERT INTO holds (
  shop_id,
  store_id,
  customer_id,
  inventory_item_id,
  hold_range,
  expires_at,
  cart_id,
  cart_item_id
)
VALUES (
  sqlc.arg(shop_id),
  sqlc.arg(store_id),
  sqlc.arg(customer_id),
  sqlc.arg(inventory_item_id),
  tstzrange(sqlc.arg(start_at), sqlc.arg(end_at), '[)'),
  sqlc.arg(expires_at),
  sqlc.arg(cart_id),
  sqlc.arg(cart_item_id)
)
RETURNING *;
