-- +goose Up
ALTER TABLE maintenance_windows
  ADD COLUMN reservation_id BIGINT REFERENCES reservations(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX ux_maintenance_windows_reservation_inventory
  ON maintenance_windows (reservation_id, inventory_item_id)
  WHERE reservation_id IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS ux_maintenance_windows_reservation_inventory;
ALTER TABLE maintenance_windows DROP COLUMN IF EXISTS reservation_id;
