-- +goose Up
CREATE TABLE shops (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    timezone    TEXT NOT NULL DEFAULT 'Europe/Zurich',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    shop_id         BIGINT REFERENCES shops(id) ON DELETE CASCADE,
    firebase_uid    TEXT UNIQUE NOT NULL,
    email           TEXT,
    display_name    TEXT,
    role            TEXT CHECK (role IN ('admin', 'staff', 'customer')) DEFAULT 'customer',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customers (
    id          BIGSERIAL PRIMARY KEY,
    shop_id     BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    email       TEXT,
    phone       TEXT,
    first_name  TEXT,
    last_name   TEXT, 
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_shop_email ON customers(shop_id, email);

-- +goose Down

DROP INDEX IF EXISTS idx_customers_shop_email;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS shops;
