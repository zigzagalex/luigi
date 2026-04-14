-- +goose Up
CREATE TABLE store_opening_times (
    store_id     BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    opens_at     TIME,
    closes_at    TIME,
    is_closed    BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (store_id, day_of_week),
    CHECK (
        (is_closed = TRUE AND opens_at IS NULL AND closes_at IS NULL)
        OR
        (is_closed = FALSE AND opens_at IS NOT NULL AND closes_at IS NOT NULL AND opens_at < closes_at)
    )
);

CREATE INDEX idx_store_opening_times_store_id ON store_opening_times(store_id);

-- +goose Down
DROP INDEX IF EXISTS idx_store_opening_times_store_id;
DROP TABLE IF EXISTS store_opening_times;
