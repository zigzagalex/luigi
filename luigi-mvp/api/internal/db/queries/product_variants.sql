-- name: ListProductVariants :many
SELECT
  id,
  product_id,
  label,
  attributes,
  is_active,
  created_at,
  updated_at
FROM product_variants
WHERE (
    sqlc.narg(product_id)::bigint IS NULL
    OR product_id = sqlc.narg(product_id)::bigint
)
ORDER BY id 
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CreateProductVariant :one
INSERT INTO product_variants (
  product_id,
  label,
  attributes,
  is_active
) VALUES (
  sqlc.arg(product_id),
  sqlc.arg(label),
  sqlc.narg(attributes)::jsonb,
  sqlc.narg(is_active)::bool
)
RETURNING
  id,
  product_id,
  label,
  attributes,
  is_active,
  created_at,
  updated_at;


-- name: UpdateProductVariant :one
UPDATE product_variants
SET
  label      = COALESCE(sqlc.narg(label)::text,  label),
  attributes = COALESCE(sqlc.narg(attributes)::jsonb, attributes),
  is_active  = COALESCE(sqlc.narg(is_active)::bool,  is_active),
  updated_at = now()
WHERE id = sqlc.arg(id)
RETURNING
  id,
  product_id,
  label,
  attributes,
  is_active,
  created_at,
  updated_at;

-- name: DeleteProductVariant :one
DELETE FROM product_variants
WHERE id = sqlc.arg(id)
RETURNING
  id,
  product_id,
  label,
  attributes,
  is_active,
  created_at,
  updated_at;

-- name: GetProductVariantByID :one
SELECT *
FROM product_variants
WHERE id = sqlc.arg(id)::bigint
LIMIT 1;
