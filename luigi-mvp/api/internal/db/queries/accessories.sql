-- name: ListAccessories :many
SELECT
  a.id,
  a.shop_id,
  a.sku,
  COALESCE(at.name, a.name) AS name,
  COALESCE(at.description, a.description) AS description,
  at.detailed_description,
  a.is_active,
  a.created_at,
  a.updated_at
FROM accessories a
LEFT JOIN accessory_translations at
  ON a.id = at.accessory_id AND at.locale = sqlc.arg(requested_locale)
WHERE (
  sqlc.narg(shop_id)::bigint IS NULL
  OR a.shop_id = sqlc.narg(shop_id)::bigint
)
AND (
  sqlc.narg(ids)::bigint[] IS NULL
  OR a.id = ANY(sqlc.narg(ids))
)
ORDER BY a.id
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: GetAccessory :one
SELECT
  a.id,
  a.shop_id,
  a.sku,
  COALESCE(at.name, a.name) AS name,
  COALESCE(at.description, a.description) AS description,
  at.detailed_description,
  a.is_active,
  a.created_at,
  a.updated_at
FROM accessories a
LEFT JOIN accessory_translations at
  ON a.id = at.accessory_id AND at.locale = sqlc.arg(requested_locale)
WHERE a.id = sqlc.arg(id);

-- name: CreateAccessory :one
INSERT INTO accessories (
  shop_id,
  sku,
  name,
  description,
  is_active
) VALUES (
  sqlc.arg(shop_id),
  sqlc.arg(sku),
  sqlc.arg(name),
  sqlc.narg(description)::text,
  sqlc.narg(is_active)::bool
)
RETURNING
  id,
  shop_id,
  sku,
  name,
  description,
  is_active,
  created_at,
  updated_at;

-- name: UpdateAccessory :one
UPDATE accessories
SET
  sku         = COALESCE(sqlc.narg(sku)::text, sku),
  name        = COALESCE(sqlc.narg(name)::text, name),
  description = COALESCE(sqlc.narg(description)::text, description),
  is_active   = COALESCE(sqlc.narg(is_active)::bool, is_active),
  updated_at  = now()
WHERE id = sqlc.arg(id)
RETURNING
  id,
  shop_id,
  sku,
  name,
  description,
  is_active,
  created_at,
  updated_at;

-- name: DeleteAccessory :one
DELETE FROM accessories
WHERE id = sqlc.arg(id)
RETURNING
  id,
  shop_id,
  sku,
  name,
  description,
  is_active,
  created_at,
  updated_at;
