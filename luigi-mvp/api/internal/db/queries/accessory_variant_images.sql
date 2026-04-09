-- name: ListImagesByAccessoryVariantID :many
SELECT *
FROM accessory_variant_images
WHERE accessory_variant_id = sqlc.arg(accessory_variant_id)
ORDER BY sort_order, id;

-- name: CreateAccessoryVariantImage :one
INSERT INTO accessory_variant_images (
    accessory_variant_id,
    object_key,
    sort_order,
    is_primary,
    alt_text,
    width_px,
    height_px
) VALUES (
    sqlc.arg(accessory_variant_id),
    sqlc.arg(object_key),
    sqlc.arg(sort_order),
    sqlc.arg(is_primary),
    sqlc.narg(alt_text)::text,
    sqlc.narg(width_px)::int,
    sqlc.narg(height_px)::int
)
RETURNING *;

-- name: GetPrimaryImageByAccessoryVariantID :one
SELECT *
FROM accessory_variant_images
WHERE accessory_variant_id = sqlc.arg(accessory_variant_id)
  AND is_primary = TRUE
ORDER BY sort_order, id
LIMIT 1;

-- name: DeleteAccessoryVariantImage :exec
DELETE FROM accessory_variant_images
WHERE id = sqlc.arg(id);

-- name: GetAccessoryVariantImage :one
SELECT *
FROM accessory_variant_images
WHERE id = sqlc.arg(id);
