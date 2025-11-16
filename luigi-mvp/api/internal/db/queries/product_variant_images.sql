-- name: ListImagesByVariantID :many
SELECT *
FROM product_variant_images
WHERE product_variant_id = sqlc.arg(product_variant_id)
ORDER BY sort_order, id;

-- name: CreateProductVariantImage :one
INSERT INTO product_variant_images (
    product_variant_id,
    object_key,
    sort_order,
    is_primary,
    alt_text,
    width_px,
    height_px
) VALUES (
    sqlc.arg(product_variant_id),
    sqlc.arg(object_key),
    sqlc.arg(sort_order),
    sqlc.arg(is_primary),
    sqlc.narg(alt_text)::text,
    sqlc.narg(width_px)::int,
    sqlc.narg(height_px)::int
)
RETURNING *;

-- name: GetPrimaryImageByVariantID :one
SELECT *
FROM product_variant_images
WHERE product_variant_id = sqlc.arg(product_variant_id)
  AND is_primary = TRUE
ORDER BY sort_order, id
LIMIT 1;

-- name: DeleteProductVariantImage :exec
DELETE FROM product_variant_images
WHERE id = sqlc.arg(id);

-- name: GetProductVariantImage :one
SELECT *
FROM product_variant_images
WHERE id = sqlc.arg(id);
