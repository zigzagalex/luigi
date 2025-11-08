-- +goose Up
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- reservation_status (idempotent)
DO $$
BEGIN
  CREATE TYPE reservation_status AS ENUM (
    'draft',
    'held',
    'confirmed',
    'out_for_pickup',
    'in_use',
    'returned',
    'serviced',
    'cancelled',
    'expired',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- payment_status (idempotent)
DO $$
BEGIN
  CREATE TYPE payment_status AS ENUM (
    'requires_payment_method',
    'requires_confirmation',
    'processing',
    'succeeded',
    'failed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- +goose Down
DROP TYPE IF EXISTS payment_status;
DROP TYPE IF EXISTS reservation_status;
