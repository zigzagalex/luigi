-- +goose Up
CREATE TABLE IF NOT EXISTS store_holidays (
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, start_date, end_date),
  CHECK (start_date <= end_date)
);

-- +goose Down
DROP TABLE IF EXISTS store_holidays;