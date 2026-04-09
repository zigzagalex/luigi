-- +goose Up
-- Merge accessories into products (variants, images, inventory use existing product_* / inventory_items tables).
ALTER TABLE products
    ADD COLUMN is_accessory BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE _acc_to_prod (
    old_accessory_id BIGINT PRIMARY KEY,
    new_product_id   BIGINT NOT NULL UNIQUE REFERENCES products (id) ON DELETE CASCADE
);

CREATE TABLE _av_to_pv (
    old_av_id BIGINT PRIMARY KEY,
    new_pv_id BIGINT NOT NULL UNIQUE REFERENCES product_variants (id) ON DELETE CASCADE
);

DO $$
DECLARE
    rec       RECORD;
    new_pid   BIGINT;
    default_pc TEXT;
BEGIN
    SELECT COALESCE(MIN(price_category), 'standard') INTO default_pc FROM price_points;

    FOR rec IN
        SELECT *
        FROM accessories
        ORDER BY id
    LOOP
        INSERT INTO products (
            shop_id,
            sku,
            name,
            description,
            price_category,
            is_active,
            is_accessory,
            created_at,
            updated_at
        )
        VALUES (
            rec.shop_id,
            rec.sku,
            rec.name,
            rec.description,
            default_pc,
            rec.is_active,
            TRUE,
            rec.created_at,
            rec.updated_at
        )
        RETURNING id INTO new_pid;

        INSERT INTO _acc_to_prod (old_accessory_id, new_product_id)
        VALUES (rec.id, new_pid);
    END LOOP;
END $$;

INSERT INTO product_translations (
    product_id,
    locale,
    name,
    description,
    detailed_description,
    created_at,
    updated_at
)
SELECT
    m.new_product_id,
    at.locale,
    at.name,
    at.description,
    at.detailed_description,
    at.created_at,
    at.updated_at
FROM accessory_translations at
JOIN _acc_to_prod m ON m.old_accessory_id = at.accessory_id;

DO $$
DECLARE
    rec     RECORD;
    new_vid BIGINT;
BEGIN
    FOR rec IN
        SELECT
            av.id AS old_av_id,
            av.label,
            av.attributes,
            av.is_active,
            av.created_at,
            av.updated_at,
            m.new_product_id
        FROM accessory_variants av
        JOIN _acc_to_prod m ON m.old_accessory_id = av.accessory_id
        ORDER BY av.id
    LOOP
        INSERT INTO product_variants (
            product_id,
            label,
            attributes,
            is_active,
            created_at,
            updated_at
        )
        VALUES (
            rec.new_product_id,
            rec.label,
            rec.attributes,
            rec.is_active,
            rec.created_at,
            rec.updated_at
        )
        RETURNING id INTO new_vid;

        INSERT INTO _av_to_pv (old_av_id, new_pv_id)
        VALUES (rec.old_av_id, new_vid);
    END LOOP;
END $$;

INSERT INTO product_variant_images (
    product_variant_id,
    object_key,
    sort_order,
    is_primary,
    alt_text,
    width_px,
    height_px,
    created_at,
    updated_at
)
SELECT
    map.new_pv_id,
    avi.object_key,
    avi.sort_order,
    avi.is_primary,
    avi.alt_text,
    avi.width_px,
    avi.height_px,
    avi.created_at,
    avi.updated_at
FROM accessory_variant_images avi
JOIN _av_to_pv map ON map.old_av_id = avi.accessory_variant_id;

INSERT INTO inventory_items (
    shop_id,
    product_variant_id,
    store_id,
    tag_code,
    serial_number,
    status,
    service_padding_before,
    service_padding_after,
    is_active,
    created_at,
    updated_at
)
SELECT
    aii.shop_id,
    map.new_pv_id,
    aii.store_id,
    aii.tag_code,
    aii.serial_number,
    aii.status,
    aii.service_padding_before,
    aii.service_padding_after,
    aii.is_active,
    aii.created_at,
    aii.updated_at
FROM accessory_inventory_items aii
JOIN _av_to_pv map ON map.old_av_id = aii.accessory_variant_id;

ALTER TABLE product_accessory
    DROP CONSTRAINT IF EXISTS product_accessory_accessory_id_fkey;

UPDATE product_accessory pa
SET accessory_id = m.new_product_id
FROM _acc_to_prod m
WHERE pa.accessory_id = m.old_accessory_id;

ALTER TABLE product_accessory
    ADD CONSTRAINT product_accessory_accessory_id_fkey
        FOREIGN KEY (accessory_id) REFERENCES products (id) ON DELETE CASCADE;

DROP TABLE IF EXISTS accessory_variant_images;
DROP TABLE IF EXISTS accessory_inventory_items;
DROP TABLE IF EXISTS accessory_variants;
DROP TABLE IF EXISTS accessory_translations;
DROP TABLE IF EXISTS accessories;

DROP TABLE IF EXISTS _av_to_pv;
DROP TABLE IF EXISTS _acc_to_prod;

-- +goose Down
-- Irreversible: restored DB must come from a backup taken before 000020.
