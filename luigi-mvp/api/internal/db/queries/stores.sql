-- name: ListStores :many
SELECT
  id, shop_id, name, address1, address2, postal_code, city, country,
  timezone, is_active, created_at, updated_at
FROM stores
WHERE (
  sqlc.narg(shop_id)::bigint IS NULL
  OR shop_id = sqlc.narg(shop_id)::bigint
)
ORDER BY id
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CreateStore :one
INSERT INTO stores (
  shop_id,
  name,
  address1,
  address2,
  postal_code,
  city,
  country,
  timezone,
  is_active
) VALUES (
  sqlc.arg(shop_id),                      
  sqlc.arg(name),                         
  sqlc.narg(address1)::text,              
  sqlc.narg(address2)::text,
  sqlc.narg(postal_code)::text,
  sqlc.narg(city)::text,
  COALESCE(sqlc.narg(country)::text, 'CH'),
  sqlc.narg(timezone)::text,
  COALESCE(sqlc.narg(is_active)::bool, TRUE)
)
RETURNING
  id, 
  shop_id, 
  name, 
  address1, 
  address2, 
  postal_code, 
  city, 
  country,
  timezone, 
  is_active, 
  created_at, 
  updated_at
;

-- name: UpdateStore :one
UPDATE stores
SET
  name        = COALESCE(sqlc.narg(name)::text,        name),
  address1    = COALESCE(sqlc.narg(address1)::text,    address1),
  address2    = COALESCE(sqlc.narg(address2)::text,    address2),
  postal_code = COALESCE(sqlc.narg(postal_code)::text, postal_code),
  city        = COALESCE(sqlc.narg(city)::text,        city),
  country     = COALESCE(sqlc.narg(country)::text,     country),
  timezone    = COALESCE(sqlc.narg(timezone)::text,    timezone),
  is_active   = COALESCE(sqlc.narg(is_active)::bool,   is_active),
  updated_at  = now()
WHERE id = sqlc.arg(id)
RETURNING
  id, shop_id, name, address1, address2, postal_code, city, country,
  timezone, is_active, created_at, updated_at;


-- name: DeleteStore :one
DELETE FROM stores
WHERE id = sqlc.arg(id)
RETURNING
  id,
  shop_id,
  name,
  address1,
  address2,
  postal_code,
  city,
  country,
  timezone,
  is_active,
  created_at,
  updated_at;
