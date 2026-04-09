-- +goose Up
CREATE TABLE accessory_variant_images (
    id BIGSERIAL PRIMARY KEY,

    accessory_variant_id BIGINT NOT NULL
        REFERENCES accessory_variants(id)
        ON DELETE CASCADE,

    object_key TEXT NOT NULL,

    sort_order INT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    alt_text TEXT,
    width_px INT,
    height_px INT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX accessory_variant_images_one_primary_per_variant
    ON accessory_variant_images (accessory_variant_id)
    WHERE is_primary = TRUE;

CREATE INDEX accessory_variant_images_variant_sort_idx
    ON accessory_variant_images (accessory_variant_id, sort_order);

-- +goose Down
DROP INDEX IF EXISTS accessory_variant_images_variant_sort_idx;
DROP INDEX IF EXISTS accessory_variant_images_one_primary_per_variant;
DROP TABLE IF EXISTS accessory_variant_images;
