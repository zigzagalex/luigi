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

-- name: ListProductsWithPrimaryImage :many
SELECT
  p.id,
  p.shop_id,
  p.sku,
  p.name,
  p.description,
  p.price_category,
  p.is_active,
  p.created_at,
  p.updated_at,
  COALESCE(pi.object_key, '') AS primary_image_object_key
FROM products p
LEFT JOIN LATERAL (
  SELECT pvi.object_key
  FROM product_variants pv
  JOIN product_variant_images pvi
    ON pvi.product_variant_id = pv.id
   AND pvi.is_primary = TRUE
  WHERE pv.product_id = p.id
  ORDER BY pv.created_at ASC 
  LIMIT 1
) AS pi ON TRUE
WHERE
  sqlc.narg(shop_id)::bigint IS NULL
  OR shop_id = sqlc.narg(shop_id)::bigint
ORDER BY p.id
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: GetProduct :one
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
WHERE id = sqlc.arg(id);
