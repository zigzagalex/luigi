-- name: ListCustomers :many
SELECT
    id,
    shop_id, 
    user_id, 
    email, 
    phone, 
    first_name, 
    last_name, 
    address1, 
    address2, 
    postal_code, 
    city, 
    country, 
    notes, 
    created_at,
    updated_at,
    is_active
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
    user_id, 
    email, 
    phone, 
    first_name, 
    last_name, 
    address1, 
    address2, 
    postal_code, 
    city, 
    country, 
    notes, 
    is_active
) VALUES (
    sqlc.arg(shop_id),
    sqlc.arg(user_id),
    sqlc.arg(email),
    sqlc.arg(phone),
    sqlc.arg(first_name),
    sqlc.arg(last_name),
    sqlc.narg(address1)::text,
    sqlc.narg(address2)::text,
    sqlc.narg(postal_code)::text,
    sqlc.narg(city)::text,
    sqlc.narg(country)::text,
    sqlc.narg(notes)::text,
    sqlc.narg(is_active)::bool
)
RETURNING *;

-- name: UpdateCustomer :one
UPDATE customers
SET
    email       = COALESCE(sqlc.narg(email)::text,  email),
    phone       = COALESCE(sqlc.narg(phone)::text,  phone),
    first_name  = COALESCE(sqlc.narg(first_name)::text,  first_name),
    last_name   = COALESCE(sqlc.narg(last_name)::text,  last_name),
    address1    = COALESCE(sqlc.narg(address1)::text, address1),
    address2    = COALESCE(sqlc.narg(address2)::text, address2),
    postal_code = COALESCE(sqlc.narg(postal_code)::text, postal_code),
    city        = COALESCE(sqlc.narg(city)::text, city),
    country     = COALESCE(sqlc.narg(country)::text, country),
    notes       = COALESCE(sqlc.narg(notes)::text,  notes),
    is_active   = COALESCE(sqlc.narg(is_active)::bool,  is_active),
    updated_at  = now()
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: DeleteCustomer :one
DELETE FROM customers
WHERE id = sqlc.arg(id) 
RETURNING *;


-- name: GetCustomerByUserID :one
SELECT 
    * 
FROM customers 
WHERE 
    user_id = sqlc.arg(user_id) 
LIMIT 1;
