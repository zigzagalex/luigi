-- name: ListMyReservations :many
SELECT
  r.*
FROM reservations r
WHERE
  r.shop_id = sqlc.arg(shop_id)::bigint
  AND r.customer_id = sqlc.arg(customer_id)::bigint
ORDER BY r.created_at DESC
LIMIT sqlc.arg(page_limit)::int
OFFSET sqlc.arg(page_offset)::int;


-- name: GetMyReservation :one
SELECT
  r.*
FROM reservations r
WHERE
  r.id = sqlc.arg(reservation_id)::bigint
  AND r.shop_id = sqlc.arg(shop_id)::bigint
  AND r.customer_id = sqlc.arg(customer_id)::bigint
LIMIT 1;


-- name: ListReservationItemsByReservationIDs :many
SELECT
  ri.*
FROM reservation_items ri
WHERE
  ri.reservation_id = ANY(sqlc.arg(reservation_ids)::bigint[])
ORDER BY ri.reservation_id, ri.id;


-- name: CancelMyReservation :one
UPDATE reservations
SET
  status = 'cancelled'::reservation_status,
  cancelled_at = now(),
  cancel_reason = sqlc.narg(cancel_reason)::text,
  version = version + 1,
  updated_at = now()
WHERE
  id = sqlc.arg(reservation_id)::bigint
  AND shop_id = sqlc.arg(shop_id)::bigint
  AND customer_id = sqlc.arg(customer_id)::bigint
  AND status = 'confirmed'::reservation_status
  AND version = sqlc.arg(expected_version)::int
RETURNING *;


-- name: DeactivateReservationItems :exec
UPDATE reservation_items
SET is_active = false
WHERE
  reservation_id = sqlc.arg(reservation_id)::bigint
  AND is_active = true;


-- name: RescheduleMyReservation :one
UPDATE reservations
SET
  start_at = sqlc.arg(start_at)::timestamptz,
  end_at   = sqlc.arg(end_at)::timestamptz,
  version  = version + 1,
  updated_at = now()
WHERE
  id = sqlc.arg(reservation_id)::bigint
  AND shop_id = sqlc.arg(shop_id)::bigint
  AND customer_id = sqlc.arg(customer_id)::bigint
  AND status = 'confirmed'::reservation_status
  AND version = sqlc.arg(expected_version)::int
RETURNING *;

-- name: RescheduleMyReservationItems :exec
UPDATE reservation_items
SET
  padded_range = tstzrange(sqlc.arg(start_at)::timestamptz, sqlc.arg(end_at)::timestamptz, '[)')::tstzrange
WHERE
  reservation_id = sqlc.arg(reservation_id)::bigint
  AND is_active = true;
