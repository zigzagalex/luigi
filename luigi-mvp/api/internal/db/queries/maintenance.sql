-- One full calendar day after reservation end (Europe/Zurich), per active line item.
-- Idempotent: skips rows already linked for this reservation + inventory item.
-- name: InsertPostRentalMaintenanceWindows :exec
INSERT INTO maintenance_windows (inventory_item_id, reservation_id, reason, time_range)
SELECT
  ri.inventory_item_id,
  sqlc.arg(reservation_id)::bigint,
  'post_rental',
  tstzrange(sqlc.arg(maint_start)::timestamptz, sqlc.arg(maint_end)::timestamptz, '[)')::tstzrange
FROM reservation_items ri
WHERE ri.reservation_id = sqlc.arg(reservation_id)::bigint
  AND ri.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM maintenance_windows mw
    WHERE mw.reservation_id = sqlc.arg(reservation_id)::bigint
      AND mw.inventory_item_id = ri.inventory_item_id
  );

-- name: DeleteMaintenanceWindowsByReservationID :exec
DELETE FROM maintenance_windows
WHERE reservation_id = sqlc.arg(reservation_id)::bigint;

-- name: DeleteMaintenanceWindowForReservationItem :exec
DELETE FROM maintenance_windows mw
USING reservation_items ri
WHERE mw.reservation_id = ri.reservation_id
  AND mw.inventory_item_id = ri.inventory_item_id
  AND ri.id = sqlc.arg(reservation_item_id)::bigint
  AND ri.reservation_id = sqlc.arg(reservation_id)::bigint;

-- name: UpdatePostRentalMaintenanceWindowsRange :exec
UPDATE maintenance_windows
SET time_range = tstzrange(sqlc.arg(maint_start)::timestamptz, sqlc.arg(maint_end)::timestamptz, '[)')::tstzrange
WHERE reservation_id = sqlc.arg(reservation_id)::bigint;
