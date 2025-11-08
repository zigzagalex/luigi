-- +goose Up
CREATE TABLE reservations (
  id                 BIGSERIAL PRIMARY KEY,
  shop_id            BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  store_id           BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id        BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  status             reservation_status NOT NULL DEFAULT 'confirmed',
  start_at           TIMESTAMPTZ NOT NULL,
  end_at             TIMESTAMPTZ NOT NULL,
  reservation_range  TSTZRANGE GENERATED ALWAYS AS (tstzrange(start_at, end_at, '[)')) STORED,
  total_price_cents  INT NOT NULL DEFAULT 0,
  currency           TEXT NOT NULL DEFAULT 'CHF',
  idempotency_key    TEXT,
  version            INT  NOT NULL DEFAULT 1,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (start_at < end_at)
);
CREATE INDEX gist_reservation_range ON reservations USING gist (reservation_range);
CREATE UNIQUE INDEX ux_res_idem ON reservations(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE reservation_items (
  id                 BIGSERIAL PRIMARY KEY,
  reservation_id     BIGINT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  inventory_item_id  BIGINT NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  padded_range       TSTZRANGE NOT NULL
);
CREATE INDEX gist_res_items ON reservation_items USING gist (inventory_item_id, padded_range);

ALTER TABLE reservation_items ADD CONSTRAINT ex_inventory_overlap
  EXCLUDE USING gist (
    inventory_item_id WITH =,
    padded_range      WITH &&
  );

-- +goose Down
ALTER TABLE reservation_items DROP CONSTRAINT IF EXISTS ex_inventory_overlap;
DROP INDEX IF EXISTS gist_res_items;
DROP TABLE IF EXISTS reservation_items;
DROP INDEX IF EXISTS ux_res_idem;
DROP INDEX IF EXISTS gist_reservation_range;
DROP TABLE IF EXISTS reservations;
