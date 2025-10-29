CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS variants (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_units (
  id SERIAL PRIMARY KEY,
  variant_id INT REFERENCES variants(id) ON DELETE CASCADE,
  identifier TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ready'
);

CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  inventory_unit_id INT REFERENCES inventory_units(id) ON DELETE CASCADE,
  during TSRANGE NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('hold','booked'))
);

ALTER TABLE reservations
  ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (
    inventory_unit_id WITH =,
    during           WITH &&
  );

