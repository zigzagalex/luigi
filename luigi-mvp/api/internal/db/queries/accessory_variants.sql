-- name: ListAccessoryVariants :many
SELECT
  id,
  accessory_id,
  label,
  attributes,
  is_active,
  created_at,
  updated_at
FROM accessory_variants
WHERE (
  sqlc.narg(accessory_id)::bigint IS NULL
  OR accessory_id = sqlc.narg(accessory_id)::bigint
)
ORDER BY id
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: GetAccessoryVariantByID :one
SELECT *
FROM accessory_variants
WHERE id = sqlc.arg(id)::bigint
LIMIT 1;

-- name: CreateAccessoryVariant :one
INSERT INTO accessory_variants (
  accessory_id,
  label,
  attributes,
  is_active
) VALUES (
  sqlc.arg(accessory_id),
  sqlc.arg(label),
  sqlc.narg(attributes)::jsonb,
  sqlc.narg(is_active)::bool
)
RETURNING
  id,
  accessory_id,
  label,
  attributes,
  is_active,
  created_at,
  updated_at;

-- name: UpdateAccessoryVariant :one
UPDATE accessory_variants
SET
  label      = COALESCE(sqlc.narg(label)::text, label),
  attributes = COALESCE(sqlc.narg(attributes)::jsonb, attributes),
  is_active  = COALESCE(sqlc.narg(is_active)::bool, is_active),
  updated_at = now()
WHERE id = sqlc.arg(id)
RETURNING
  id,
  accessory_id,
  label,
  attributes,
  is_active,
  created_at,
  updated_at;

-- name: DeleteAccessoryVariant :one
DELETE FROM accessory_variants
WHERE id = sqlc.arg(id)
RETURNING
  id,
  accessory_id,
  label,
  attributes,
  is_active,
  created_at,
  updated_at;
