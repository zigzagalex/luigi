-- +goose Up
CREATE TABLE maintenance_windows (
  id                BIGSERIAL PRIMARY KEY,
  inventory_item_id BIGINT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  reason            TEXT,
  time_range        TSTZRANGE NOT NULL
);
CREATE INDEX gist_maintenance_range ON maintenance_windows USING gist (inventory_item_id, time_range);

CREATE TABLE holds (
  id                BIGSERIAL PRIMARY KEY,
  shop_id           BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id       BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  inventory_item_id BIGINT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  hold_range        TSTZRANGE NOT NULL,      -- always build with [)
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_holds_expires ON holds(expires_at);
CREATE INDEX gist_holds ON holds USING gist (inventory_item_id, hold_range);

-- +goose Down
DROP INDEX IF EXISTS gist_holds;
DROP INDEX IF EXISTS idx_holds_expires;
DROP TABLE IF EXISTS holds;
DROP INDEX IF EXISTS gist_maintenance_range;
DROP TABLE IF EXISTS maintenance_windows;
