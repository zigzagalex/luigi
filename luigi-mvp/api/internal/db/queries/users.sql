-- name: ListUsers :many
SELECT 
    id,
    shop_id,
    store_id,
    firebase_uid,
    email,
    display_name,
    role,
    is_active,
    created_at,
    updated_at
FROM users
WHERE (
    sqlc.narg(shop_id)::bigint IS NULL
    OR shop_id = sqlc.narg(shop_id)::bigint
)
ORDER BY id 
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);


-- name: CreateUser :one
INSERT INTO users (
    shop_id,
    store_id,
    firebase_uid,
    email,
    display_name,
    role,
    is_active
) VALUES (
    sqlc.arg(shop_id),
    sqlc.arg(store_id),
    sqlc.narg(firebase_uid)::text,
    sqlc.arg(email),
    sqlc.arg(display_name),
    sqlc.arg(role)::text,
    sqlc.narg(is_active)::bool
)
RETURNING
    id,
    shop_id,
    store_id,
    firebase_uid,
    email,
    display_name,
    role,
    is_active,
    created_at,
    updated_at;


-- name: UpdateUser :one
UPDATE users
SET 
    email = COALESCE(sqlc.narg(email)::text,        email),
    display_name = COALESCE(sqlc.narg(display_name)::text,        display_name),
    role = COALESCE(sqlc.narg(role)::text,        role),
    is_active  = COALESCE(sqlc.narg(is_active)::bool,   is_active),
    updated_at  = now()
WHERE id = sqlc.arg(id)
RETURNING
    id,
    shop_id,
    store_id,
    firebase_uid,
    email,
    display_name,
    role,
    is_active,
    created_at,
    updated_at;


-- name: DeleteUser :one
DELETE FROM users
WHERE id = sqlc.arg(id)
RETURNING
  id, 
  shop_id, 
  store_id, 
  firebase_uid, 
  email, 
  display_name,
  role, 
  is_active, 
  created_at, updated_at;


-- name: GetUserByFirebaseUID :one
SELECT
    *
FROM users
WHERE firebase_uid = sqlc.arg(firebase_uid);