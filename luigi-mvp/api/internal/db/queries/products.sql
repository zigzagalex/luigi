-- name: ListProducts :many
SELECT
  id,
  shop_id,
  sku,
  name,
  description,
  price_category,
  is_active,
  created_at,
  updated_at
FROM products
WHERE (
    sqlc.narg(shop_id)::bigint IS NULL
    OR shop_id = sqlc.narg(shop_id)::bigint
)
ORDER BY id
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);


-- name: CreateProduct :one
INSERT INTO products (
  shop_id,
  sku,
  name,
  description,
  price_category,
  is_active
) VALUES (
  sqlc.arg(shop_id),
  sqlc.arg(sku),
  sqlc.arg(name),
  sqlc.narg(description)::text,
  sqlc.arg(price_category),
  sqlc.narg(is_active)::bool
)
RETURNING
  id,
  shop_id,
  sku,
  name,
  description,
  price_category,
  is_active,
  created_at,
  updated_at;


-- name: UpdateProduct :one
UPDATE products
SET
  sku            = COALESCE(sqlc.narg(sku)::text,  sku),
  name           = COALESCE(sqlc.narg(name)::text,  name),
  description    = COALESCE(sqlc.narg(description)::text,  description),
  price_category = COALESCE(sqlc.narg(price_category)::text,  price_category),
  is_active      = COALESCE(sqlc.narg(is_active)::bool,  is_active),
  updated_at     = now()
WHERE id = sqlc.arg(id)
RETURNING
  id,
  shop_id,
  sku,
  name,
  description,
  price_category,
  is_active,
  created_at,
  updated_at;

-- name: DeleteProduct :one
DELETE FROM products
WHERE id = sqlc.arg(id)
RETURNING
  id,
  shop_id,
  sku,
  name,
  description,
  price_category,
  is_active,
  created_at,
  updated_at;
