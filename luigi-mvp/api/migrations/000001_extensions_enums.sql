-- +goose Up
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- reservation_status
-- +goose StatementBegin
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_status') THEN
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
  END IF;
END
$$;
-- +goose StatementEnd

-- payment_status
-- +goose StatementBegin
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM (
      'requires_payment_method',
      'requires_confirmation',
      'processing',
      'succeeded',
      'failed',
      'cancelled'
    );
  END IF;
END
$$;
-- +goose StatementEnd

-- +goose Down
DROP TYPE IF EXISTS payment_status;
DROP TYPE IF EXISTS reservation_status;
