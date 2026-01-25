-- +goose Up
-- +goose StatementBegin
DO $$ 
BEGIN
  CREATE TYPE cart_status AS ENUM ('open', 'checked_out', 'abandoned', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
-- +goose StatementEnd

CREATE TABLE carts (
    id           BIGSERIAL PRIMARY KEY,
    shop_id      BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    store_id     BIGINT REFERENCES stores(id) ON DELETE CASCADE,

    -- owner (guest or logged in)
    customer_id  BIGINT REFERENCES customers(id) ON DELETE SET NULL,
    session_id   TEXT, -- for guest carts; set for anonymous users

    status       cart_status NOT NULL DEFAULT 'open',

    -- cart lifetime (separate from per-hold expires_at)
    expires_at   TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (customer_id IS NOT NULL OR session_id IS NOT NULL)
);

-- Fast lookup for "current cart"
CREATE INDEX idx_carts_customer_open ON carts(customer_id) WHERE status = 'open';
CREATE INDEX idx_carts_session_open  ON carts(session_id)  WHERE status = 'open';
CREATE INDEX idx_carts_expires_at    ON carts(expires_at);

-- At most one cart per session user/customer
CREATE UNIQUE INDEX ux_one_open_cart_per_customer
  ON carts(customer_id)
  WHERE customer_id IS NOT NULL AND status = 'open';

CREATE UNIQUE INDEX ux_one_open_cart_per_session
  ON carts(session_id)
  WHERE session_id IS NOT NULL AND status = 'open';

CREATE TABLE cart_items (
  id                BIGSERIAL PRIMARY KEY,
  cart_id            BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,

  product_id         BIGINT,  
  variant_id         BIGINT,  

  -- lock on the inventory item
  inventory_item_id  BIGINT NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,

  start_at           TIMESTAMPTZ NOT NULL,
  end_at             TIMESTAMPTZ NOT NULL,
  desired_range      TSTZRANGE GENERATED ALWAYS AS (tstzrange(start_at, end_at, '[)')) STORED,

  unit_price_cents   INT NOT NULL DEFAULT 0,
  currency           TEXT NOT NULL DEFAULT 'CHF',

  quantity           INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (start_at < end_at)
);

CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_cart_items_inventory ON cart_items(inventory_item_id);
CREATE INDEX gist_cart_items_range ON cart_items USING gist (inventory_item_id, desired_range);

-- Tie holds to cart/cart_item so checkout can validate ownership easily
ALTER TABLE holds
  ADD COLUMN cart_id BIGINT REFERENCES carts(id) ON DELETE CASCADE;

ALTER TABLE holds
  ADD COLUMN cart_item_id BIGINT REFERENCES cart_items(id) ON DELETE CASCADE;

CREATE INDEX idx_holds_cart ON holds(cart_id);
CREATE INDEX idx_holds_cart_item ON holds(cart_item_id);


-- +goose Down

DROP INDEX IF EXISTS idx_holds_cart_item;
DROP INDEX IF EXISTS idx_holds_cart;

ALTER TABLE holds DROP COLUMN IF EXISTS cart_item_id;
ALTER TABLE holds DROP COLUMN IF EXISTS cart_id;

DROP INDEX IF EXISTS gist_cart_items_range;
DROP INDEX IF EXISTS idx_cart_items_inventory;
DROP INDEX IF EXISTS idx_cart_items_cart;
DROP TABLE IF EXISTS cart_items;

DROP INDEX IF EXISTS ux_one_open_cart_per_session;
DROP INDEX IF EXISTS ux_one_open_cart_per_customer;
DROP INDEX IF EXISTS idx_carts_expires_at;
DROP INDEX IF EXISTS idx_carts_session_open;
DROP INDEX IF EXISTS idx_carts_customer_open;
DROP TABLE IF EXISTS carts;

DROP TYPE IF EXISTS cart_status;