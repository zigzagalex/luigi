-- +goose Up
CREATE TABLE accessory_variants (
    id           BIGSERIAL PRIMARY KEY,
    accessory_id BIGINT NOT NULL REFERENCES accessories(id) ON DELETE CASCADE,
    label        TEXT NOT NULL,
    attributes   JSONB,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_accessory_variants ON accessory_variants(accessory_id, label);
CREATE INDEX idx_accessory_variants_accessory ON accessory_variants(accessory_id);

-- +goose Down
DROP INDEX IF EXISTS idx_accessory_variants_accessory;
DROP INDEX IF EXISTS ux_accessory_variants;
DROP TABLE IF EXISTS accessory_variants;
