-- +goose Up
CREATE TABLE inventory_items (
  id                     BIGSERIAL PRIMARY KEY,
  shop_id                BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_variant_id     BIGINT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  tag_code               TEXT UNIQUE,
  serial_number          TEXT,
  status                 TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','retired')),
  service_padding_before INTERVAL NOT NULL DEFAULT INTERVAL '0 minutes',
  service_padding_after  INTERVAL NOT NULL DEFAULT INTERVAL '0 minutes',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inventory_shop_variant ON inventory_items(shop_id, product_variant_id);

-- +goose Down
DROP INDEX IF EXISTS idx_inventory_shop_variant;
DROP TABLE IF EXISTS inventory_items;
