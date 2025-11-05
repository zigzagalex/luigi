-- +goose Up
CREATE TABLE products (
    id             BIGSERIAL PRIMARY KEY,
    shop_id        BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE, 
    sku            TEXT UNIQUE,
    name           TEXT NOT NULL,
    description    TEXT,
    price_category TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
create INDEX idx_products_shop ON products(shop_id);

CREATE TABLE product_variants (
    id         BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    label      TEXT NOT NULL,
    attributes JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_product_variants ON product_variants(product_id, label);

CREATE TABLE accessories (
    id          BIGSERIAL PRIMARY KEY,
    shop_id     BIGINT NOT NULL REFERENCES shops(id),
    sku         TEXT UNIQUE,
    name        TEXT NOT NULL,
    description TEXT
);

CREATE TABLE product_accessory (
    product_id   BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    accessory_id BIGINT NOT NULL REFERENCES accessories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, accessory_id)  
);


-- +goose Down
DROP TABLE IF EXISTS product_accessory;
DROP TABLE IF EXISTS accessories;
DROP INDEX IF EXISTS ux_product_variants;
DROP TABLE IF EXISTS product_variants;
DROP INDEX IF EXISTS idx_products_shop;
DROP TABLE IF EXISTS products;
