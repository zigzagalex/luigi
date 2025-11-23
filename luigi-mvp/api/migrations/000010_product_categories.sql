-- +goose Up
CREATE TABLE product_categories (
    id          BIGSERIAL PRIMARY KEY,
    shop_id     BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    parent_id   BIGINT REFERENCES product_categories(id) ON DELETE SET NULL,

    slug        TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,

    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT product_categories_shop_slug_uniq UNIQUE (shop_id, slug)
);

CREATE INDEX product_categories_shop_parent_idx
    ON product_categories (shop_id, parent_id);

CREATE TABLE product_category_assignments (
    product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,

    PRIMARY KEY (product_id, category_id)
);


-- +goose Down
DROP TABLE IF EXISTS product_category_assignments;
DROP TABLE IF EXISTS product_categories;

