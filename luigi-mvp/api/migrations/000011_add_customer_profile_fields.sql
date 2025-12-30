-- +goose Up
ALTER TABLE customers
  ADD COLUMN user_id BIGINT UNIQUE,
  ADD COLUMN address1 TEXT,
  ADD COLUMN address2 TEXT,
  ADD COLUMN postal_code TEXT,
  ADD COLUMN city TEXT,
  ADD COLUMN country TEXT NOT NULL DEFAULT 'CH';

ALTER TABLE customers
  ADD CONSTRAINT customers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);

-- +goose Down
DROP INDEX IF EXISTS idx_customers_user_id;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_user_id_fkey;
ALTER TABLE customers
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS address1,
  DROP COLUMN IF EXISTS address2,
  DROP COLUMN IF EXISTS postal_code,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS country;
