-- +goose Up
CREATE TABLE accessory_inventory_items (
  id                     BIGSERIAL PRIMARY KEY,
  shop_id                BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  accessory_variant_id   BIGINT NOT NULL REFERENCES accessory_variants(id) ON DELETE CASCADE,
  store_id               BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tag_code               TEXT UNIQUE,
  serial_number          TEXT,
  status                 TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','retired')),
  service_padding_before INTERVAL NOT NULL DEFAULT INTERVAL '0 minutes',
  service_padding_after  INTERVAL NOT NULL DEFAULT INTERVAL '0 minutes',
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_acc_inventory_shop_variant ON accessory_inventory_items(shop_id, accessory_variant_id);
CREATE INDEX idx_acc_inventory_active ON accessory_inventory_items(is_active);

-- +goose Down
DROP INDEX IF EXISTS idx_acc_inventory_active;
DROP INDEX IF EXISTS idx_acc_inventory_shop_variant;
DROP TABLE IF EXISTS accessory_inventory_items;
