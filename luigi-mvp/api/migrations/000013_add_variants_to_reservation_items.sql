-- +goose Up
ALTER TABLE reservation_items
  ADD COLUMN product_id BIGINT,
  ADD COLUMN variant_id BIGINT,
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN unit_price_cents INT NOT NULL DEFAULT 0,
  ADD COLUMN quantity INT NOT NULL DEFAULT 1,
  ADD COLUMN currency TEXT NOT NULL DEFAULT 'CHF';
ALTER TABLE reservation_items 
    ADD CONSTRAINT fk_res_item_product FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE reservation_items 
    ADD CONSTRAINT fk_res_item_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id);



ALTER TABLE reservation_items DROP CONSTRAINT ex_inventory_overlap;

ALTER TABLE reservation_items ADD CONSTRAINT ex_inventory_overlap
  EXCLUDE USING gist (
    inventory_item_id WITH =,
    padded_range      WITH &&
  )
  WHERE (is_active);

-- +goose Down

ALTER TABLE reservation_items
  DROP CONSTRAINT IF EXISTS ex_inventory_overlap;

ALTER TABLE reservation_items
  ADD CONSTRAINT ex_inventory_overlap
  EXCLUDE USING gist (
    inventory_item_id WITH =,
    padded_range      WITH &&
  );

ALTER TABLE reservation_items
  DROP CONSTRAINT IF EXISTS fk_res_item_variant;

ALTER TABLE reservation_items
  DROP CONSTRAINT IF EXISTS fk_res_item_product;

ALTER TABLE reservation_items
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS quantity,
  DROP COLUMN IF EXISTS unit_price_cents,
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS variant_id,
  DROP COLUMN IF EXISTS product_id;

