-- +goose Up
CREATE TABLE price_points (
  price_category     TEXT NOT NULL,
  day_count          INT  NOT NULL CHECK (day_count > 0),
  price_total_cents  INT  NOT NULL CHECK (price_total_cents >= 0),
  PRIMARY KEY (price_category, day_count)
);

-- +goose Down
DROP TABLE IF EXISTS price_points;
