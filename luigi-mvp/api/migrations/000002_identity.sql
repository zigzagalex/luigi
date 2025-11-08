-- +goose Up
CREATE TABLE shops (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    timezone    TEXT NOT NULL DEFAULT 'Europe/Zurich',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stores (
  id          BIGSERIAL PRIMARY KEY,
  shop_id     BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address1    TEXT,
  address2    TEXT,
  postal_code TEXT,
  city        TEXT,
  country     TEXT DEFAULT 'CH',
  timezone    TEXT, -- optional override; fallback to shop.timezone
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stores_shop ON stores(shop_id);
CREATE INDEX idx_stores_active ON stores(is_active);

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    shop_id         BIGINT REFERENCES shops(id) ON DELETE CASCADE,
    store_id        BIGINT REFERENCES stores(id) ON DELETE SET NULL, 
    firebase_uid    TEXT UNIQUE NOT NULL,
    email           TEXT,
    display_name    TEXT,
    role            TEXT CHECK (role IN ('admin', 'staff', 'customer')) DEFAULT 'customer',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_shop ON users(shop_id);
CREATE INDEX idx_users_store ON users(store_id);
CREATE INDEX idx_users_active ON users(is_active);

CREATE TABLE customers (
    id          BIGSERIAL PRIMARY KEY,
    shop_id     BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    email       TEXT,
    phone       TEXT,
    first_name  TEXT,
    last_name   TEXT, 
    notes       TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_shop_email ON customers(shop_id, email);
CREATE INDEX idx_customers_active ON customers(is_active);

-- +goose Down
DROP INDEX IF EXISTS idx_customers_active;
DROP INDEX IF EXISTS idx_customers_shop_email;
DROP TABLE IF EXISTS customers;

DROP INDEX IF EXISTS idx_users_active;
DROP INDEX IF EXISTS idx_users_store;
DROP INDEX IF EXISTS idx_users_shop;
DROP TABLE IF EXISTS users;

DROP INDEX IF EXISTS idx_stores_active;
DROP INDEX IF EXISTS idx_stores_shop;
DROP TABLE IF EXISTS stores;

DROP TABLE IF EXISTS shops;
