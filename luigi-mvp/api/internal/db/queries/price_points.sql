-- name: ListPricePoints :many
SELECT *
FROM price_points
ORDER BY price_category, day_count;

-- name: GetPricePoint :one
SELECT *
FROM price_points
WHERE price_category = $1
  AND day_count = $2;

-- name: UpsertPricePoint :one
INSERT INTO price_points (
  price_category,
  day_count,
  price_total_cents
) VALUES (
  $1, $2, $3
)
ON CONFLICT (price_category, day_count)
DO UPDATE SET
  price_total_cents = EXCLUDED.price_total_cents
RETURNING *;

-- name: DeletePricePoint :exec
DELETE FROM price_points
WHERE price_category = $1
  AND day_count = $2;
