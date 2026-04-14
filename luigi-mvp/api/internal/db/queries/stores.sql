-- name: ListStores :many
SELECT
  id, shop_id, name, address1, address2, postal_code, city, country,
  timezone, is_active, created_at, updated_at
FROM stores
WHERE (
  sqlc.narg(shop_id)::bigint IS NULL
  OR shop_id = sqlc.narg(shop_id)::bigint
)
ORDER BY id
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CreateStore :one
INSERT INTO stores (
  shop_id,
  name,
  address1,
  address2,
  postal_code,
  city,
  country,
  timezone,
  is_active
) VALUES (
  sqlc.arg(shop_id),                      
  sqlc.arg(name),                         
  sqlc.narg(address1)::text,              
  sqlc.narg(address2)::text,
  sqlc.narg(postal_code)::text,
  sqlc.narg(city)::text,
  sqlc.narg(country)::text, 
  sqlc.narg(timezone)::text,
  COALESCE(sqlc.narg(is_active)::bool, TRUE)
)
RETURNING
  id, 
  shop_id, 
  name, 
  address1, 
  address2, 
  postal_code, 
  city, 
  country,
  timezone, 
  is_active, 
  created_at, 
  updated_at
;

-- name: UpdateStore :one
UPDATE stores
SET
  name        = COALESCE(sqlc.narg(name)::text,        name),
  address1    = COALESCE(sqlc.narg(address1)::text,    address1),
  address2    = COALESCE(sqlc.narg(address2)::text,    address2),
  postal_code = COALESCE(sqlc.narg(postal_code)::text, postal_code),
  city        = COALESCE(sqlc.narg(city)::text,        city),
  country     = COALESCE(sqlc.narg(country)::text,     country),
  timezone    = COALESCE(sqlc.narg(timezone)::text,    timezone),
  is_active   = COALESCE(sqlc.narg(is_active)::bool,   is_active),
  updated_at  = now()
WHERE id = sqlc.arg(id)
RETURNING
  id, shop_id, name, address1, address2, postal_code, city, country,
  timezone, is_active, created_at, updated_at;


-- name: DeleteStore :one
DELETE FROM stores
WHERE id = sqlc.arg(id)
RETURNING
  id,
  shop_id,
  name,
  address1,
  address2,
  postal_code,
  city,
  country,
  timezone,
  is_active,
  created_at,
  updated_at;


-- name: GetStoreById :one
SELECT 
  *
FROM stores
WHERE id = sqlc.arg(store_id)::bigint;

-- name: ListStoreOpeningTimes :many
SELECT
  store_id,
  day_of_week,
  opens_at::text AS opens_at,
  closes_at::text AS closes_at,
  is_closed
FROM store_opening_times
WHERE store_id = sqlc.arg(store_id)::bigint
ORDER BY day_of_week;

-- name: DeleteStoreOpeningTimes :exec
DELETE FROM store_opening_times
WHERE store_id = sqlc.arg(store_id)::bigint;

-- name: UpsertStoreOpeningTime :exec
INSERT INTO store_opening_times (
  store_id,
  day_of_week,
  opens_at,
  closes_at,
  is_closed
) VALUES (
  sqlc.arg(store_id),
  sqlc.arg(day_of_week),
  sqlc.narg(opens_at)::time,
  sqlc.narg(closes_at)::time,
  COALESCE(sqlc.narg(is_closed)::bool, FALSE)
)
ON CONFLICT (store_id, day_of_week)
DO UPDATE SET
  opens_at = EXCLUDED.opens_at,
  closes_at = EXCLUDED.closes_at,
  is_closed = EXCLUDED.is_closed;

-- name: ListStoreHolidays :many
SELECT
  store_id,
  start_date,
  end_date,
  note,
  created_at,
  updated_at
FROM store_holidays
WHERE store_id = sqlc.arg(store_id)::bigint
ORDER BY start_date, end_date;

-- name: DeleteStoreHolidays :exec
DELETE FROM store_holidays
WHERE store_id = sqlc.arg(store_id)::bigint;

-- name: CreateStoreHoliday :exec
INSERT INTO store_holidays (
  store_id,
  start_date,
  end_date,
  note
) VALUES (
  sqlc.arg(store_id),
  sqlc.arg(start_date),
  sqlc.arg(end_date),
  sqlc.narg(note)::text
);