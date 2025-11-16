-- +goose Up
CREATE TABLE product_variant_images (
    id BIGSERIAL PRIMARY KEY,

    product_variant_id BIGINT NOT NULL
        REFERENCES product_variants(id)
        ON DELETE CASCADE,

    -- path/key in GCS, not full URL
    object_key TEXT NOT NULL,

    sort_order INT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    alt_text TEXT,
    width_px INT,
    height_px INT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- one primary image per variant (enforced by partial unique index)
CREATE UNIQUE INDEX product_variant_images_one_primary_per_variant
    ON product_variant_images (product_variant_id)
    WHERE is_primary = TRUE;

CREATE INDEX product_variant_images_variant_sort_idx
    ON product_variant_images (product_variant_id, sort_order);

-- +goose Down
DROP INDEX IF EXISTS product_variant_images_variant_sort_idx;
DROP INDEX IF EXISTS product_variant_images_one_primary_per_variant;
DROP TABLE IF EXISTS product_variant_images;
