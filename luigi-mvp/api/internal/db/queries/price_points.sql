-- name: ListPricePoints :many
SELECT *
FROM price_points
ORDER BY price_category, day_count;

-- name: GetPricePoint :one
SELECT *
FROM price_points
WHERE price_category = sqlc.arg(price_category)
  AND day_count = sqlc.arg(day_count);

-- name: UpsertPricePoint :one
INSERT INTO price_points (
  price_category,
  day_count,
  price_total_cents
) VALUES (
  sqlc.arg(price_category), 
  sqlc.arg(day_count), 
  sqlc.arg(price_total_cents)
)
ON CONFLICT (price_category, day_count)
DO UPDATE SET
  price_total_cents = EXCLUDED.price_total_cents
RETURNING *;

-- name: DeletePricePoint :exec
DELETE FROM price_points
WHERE price_category = sqlc.arg(price_category)
  AND day_count = sqlc.arg(day_count);
