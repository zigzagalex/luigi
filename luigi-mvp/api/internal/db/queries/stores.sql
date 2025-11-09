-- name: ListStores :many
SELECT
  id, shop_id, name, address1, address2, postal_code, city, country,
  timezone, is_active, created_at, updated_at
FROM stores
WHERE (sqlc.narg(shop_id) IS NULL OR shop_id = sqlc.narg(shop_id))
ORDER BY id
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CreateStore :one
INSERT INTO stores (
  shop_id, name, address1, address2, postal_code, city, country, timezone, is_active
) VALUES (
  sqlc.arg(shop_id),
  sqlc.arg(name),
  sqlc.narg(address1),
  sqlc.narg(address2),
  sqlc.narg(postal_code),
  sqlc.narg(city),
  COALESCE(sqlc.narg(country), 'CH'),
  sqlc.narg(timezone),
  COALESCE(sqlc.narg(is_active), TRUE)
)
RETURNING
  id, shop_id, name, address1, address2, postal_code, city, country,
  timezone, is_active, created_at, updated_at;

-- name: UpdateStore :one
UPDATE stores
SET
  name        = COALESCE(sqlc.narg(name), name),
  address1    = COALESCE(sqlc.narg(address1), address1),
  address2    = COALESCE(sqlc.narg(address2), address2),
  postal_code = COALESCE(sqlc.narg(postal_code), postal_code),
  city        = COALESCE(sqlc.narg(city), city),
  country     = COALESCE(sqlc.narg(country), country),
  timezone    = COALESCE(sqlc.narg(timezone), timezone),
  is_active   = COALESCE(sqlc.narg(is_active), is_active),
  updated_at  = now()
WHERE id = sqlc.arg(id)
RETURNING
  id, shop_id, name, address1, address2, postal_code, city, country,
  timezone, is_active, created_at, updated_at;
