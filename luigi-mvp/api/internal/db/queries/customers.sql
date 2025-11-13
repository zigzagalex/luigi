-- name: ListCustomers :many
SELECT
    id,
    shop_id,
    email,
    phone,
    first_name,
    last_name,
    notes,
    is_active,
    created_at,
    updated_at
FROM customers
WHERE (
    sqlc.narg(shop_id)::bigint IS NULL
    OR shop_id = sqlc.narg(shop_id)::bigint
)
ORDER BY id 
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CreateCustomer :one
INSERT INTO customers (
    shop_id,
    email,
    phone,
    first_name,
    last_name,
    notes,
    is_active
) VALUES (
    sqlc.arg(shop_id),
    sqlc.arg(email),
    sqlc.arg(phone),
    sqlc.arg(first_name),
    sqlc.arg(last_name),
    sqlc.narg(notes)::text,
    sqlc.narg(is_active)::bool
)
    RETURNING
    id,
    shop_id,
    email,
    phone,
    first_name,
    last_name,
    notes,
    is_active,
    created_at,
    updated_at;

-- name: UpdateCustomer :one
UPDATE customers
SET
    email       = COALESCE(sqlc.narg(email)::text,  email),
    phone       = COALESCE(sqlc.narg(phone)::text,  phone),
    first_name  = COALESCE(sqlc.narg(first_name)::text,  first_name),
    last_name   = COALESCE(sqlc.narg(last_name)::text,  last_name),
    notes       = COALESCE(sqlc.narg(notes)::text,  notes),
    is_active   = COALESCE(sqlc.narg(is_active)::bool,  is_active),
    updated_at  = now()
WHERE id = sqlc.arg(id)
RETURNING
    id,
    shop_id,
    email,
    phone,
    first_name,
    last_name,
    notes,
    is_active,
    created_at,
    updated_at;

-- name: DeleteCustomer :one
DELETE FROM customers
WHERE id = $1
RETURNING
  id,
  shop_id,
  email,
  phone,
  first_name,
  last_name,
  notes,
  is_active,
  created_at,
  updated_at;
