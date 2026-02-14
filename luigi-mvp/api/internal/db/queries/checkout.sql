-- name: CheckoutCreateReservation :one
WITH ins AS (
  INSERT INTO reservations (
    shop_id,
    store_id,
    customer_id,
    status,
    start_at,
    end_at,
    total_price_cents,
    currency,
    idempotency_key,
    notes,
    pickup_person_name,
    pickup_person_phone,
    pickup_person_email,
    store_snapshot_name
  )
  SELECT
    sqlc.arg(shop_id)::bigint,
    sqlc.arg(store_id)::bigint,
    sqlc.narg(customer_id)::bigint,
    'confirmed'::reservation_status,
    sqlc.arg(start_at)::timestamptz,
    sqlc.arg(end_at)::timestamptz,
    COALESCE(SUM(ci.unit_price_cents * ci.quantity), 0)::int,
    COALESCE(MAX(ci.currency), 'CHF')::text,
    sqlc.arg(idempotency_key)::text,
    sqlc.narg(notes)::text,
    sqlc.narg(pickup_person_name)::text,
    sqlc.narg(pickup_person_phone)::text,
    sqlc.narg(pickup_person_email)::text,
    (SELECT s.name FROM stores s WHERE s.id = sqlc.arg(store_id)::bigint)
  FROM cart_items ci
  WHERE ci.id = ANY(sqlc.arg(cart_item_ids)::bigint[])
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL
  DO NOTHING
  RETURNING *
)
SELECT * FROM ins
UNION ALL
SELECT * FROM reservations r
WHERE r.idempotency_key = sqlc.arg(idempotency_key)::text
LIMIT 1;


-- name: CheckoutInsertReservationItemsFromCartItemIDs :many
INSERT INTO reservation_items (
  reservation_id,
  inventory_item_id,
  padded_range,
  product_id,
  variant_id,
  is_active,
  unit_price_cents,
  quantity,
  currency
)
SELECT
  sqlc.arg(reservation_id)::bigint,
  ci.inventory_item_id::bigint,
  tstzrange(ci.start_at, ci.end_at, '[)')::tstzrange,
  ci.product_id::bigint,
  ci.variant_id::bigint,
  true,
  ci.unit_price_cents::int,
  ci.quantity::int,
  ci.currency::text
FROM cart_items ci
WHERE ci.id = ANY(sqlc.arg(cart_item_ids)::bigint[])
  AND NOT EXISTS (
    SELECT 1
    FROM reservation_items ri
    WHERE ri.reservation_id = sqlc.arg(reservation_id)::bigint
  )
RETURNING *;
