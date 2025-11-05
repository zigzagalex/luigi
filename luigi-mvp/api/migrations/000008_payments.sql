-- +goose Up
CREATE TABLE payments (
  id                  BIGSERIAL PRIMARY KEY,
  reservation_id      BIGINT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL DEFAULT 'test',
  status              payment_status NOT NULL DEFAULT 'requires_payment_method',
  amount_cents        INT  NOT NULL CHECK (amount_cents >= 0),
  currency            TEXT NOT NULL DEFAULT 'CHF',
  client_reference_id TEXT,
  idempotency_key     TEXT,
  test_mode           BOOLEAN NOT NULL DEFAULT true,
  confirmed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_reservation ON payments(reservation_id);
CREATE UNIQUE INDEX ux_payment_idem ON payments(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE payment_events (
  id               BIGSERIAL PRIMARY KEY,
  payment_id       BIGINT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  previous_status  payment_status,
  new_status       payment_status,
  payload          JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_events_payment ON payment_events(payment_id);

-- +goose Down
DROP INDEX IF EXISTS idx_payment_events_payment;
DROP TABLE IF EXISTS payment_events;
DROP INDEX IF EXISTS ux_payment_idem;
DROP INDEX IF EXISTS idx_payments_reservation;
DROP TABLE IF EXISTS payments;
