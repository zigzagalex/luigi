-- +goose Up

ALTER TABLE reservations
  ADD COLUMN pickup_person_name   TEXT,
  ADD COLUMN pickup_person_phone  TEXT,
  ADD COLUMN pickup_person_email  TEXT,
  ADD COLUMN cancelled_at         TIMESTAMPTZ,
  ADD COLUMN cancel_reason        TEXT,
  ADD COLUMN store_snapshot_name  TEXT;

CREATE INDEX idx_reservations_cancelled_at
  ON reservations(cancelled_at);


-- +goose Down

DROP INDEX IF EXISTS idx_reservations_cancelled_at;

ALTER TABLE reservations
  DROP COLUMN IF EXISTS store_snapshot_name,
  DROP COLUMN IF EXISTS cancel_reason,
  DROP COLUMN IF EXISTS cancelled_at,
  DROP COLUMN IF EXISTS pickup_person_email,
  DROP COLUMN IF EXISTS pickup_person_phone,
  DROP COLUMN IF EXISTS pickup_person_name;
