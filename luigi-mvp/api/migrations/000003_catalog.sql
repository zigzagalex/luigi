-- +goose Up
CREATE TABLE products (
    id             BIGSERIAL PRIMARY KEY,
    shop_id        BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    sku            TEXT UNIQUE,
    name           TEXT NOT NULL,
    description    TEXT,
    price_category TEXT NOT NULL,
    is_accessory   BOOLEAN NOT NULL DEFAULT FALSE,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_shop ON products(shop_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_is_accessory ON products(is_accessory);

CREATE TABLE product_variants (
    id         BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    label      TEXT NOT NULL,
    attributes JSONB,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_product_variants ON product_variants(product_id, label);

-- Links a rental product to an add-on product (both rows are in `products`; add-ons use is_accessory = TRUE).
CREATE TABLE product_accessory (
    product_id   BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    accessory_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, accessory_id),
    CHECK (product_id <> accessory_id)
);


-- +goose Down
DROP TABLE IF EXISTS product_accessory;
DROP INDEX IF EXISTS ux_product_variants;
DROP TABLE IF EXISTS product_variants;
DROP INDEX IF EXISTS idx_products_is_accessory;
DROP INDEX IF EXISTS idx_products_active;
DROP INDEX IF EXISTS idx_products_shop;
DROP TABLE IF EXISTS products;
