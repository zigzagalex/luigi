-- name: ListShops :many
SELECT id, name, timezone, is_active, created_at, updated_at
FROM shops
ORDER BY id
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CreateShop :one
INSERT INTO shops (name, timezone, is_active)
VALUES (
  sqlc.arg(name),
  COALESCE(sqlc.narg(timezone), 'Europe/Zurich'),
  COALESCE(sqlc.narg(is_active), TRUE)
)
RETURNING id, name, timezone, is_active, created_at, updated_at;

-- name: UpdateShop :one
UPDATE shops
SET
  name      = COALESCE(sqlc.narg(name), name),
  timezone  = COALESCE(sqlc.narg(timezone), timezone),
  is_active = COALESCE(sqlc.narg(is_active), is_active),
  updated_at = now()
WHERE id = sqlc.arg(id)
RETURNING id, name, timezone, is_active, created_at, updated_at;
