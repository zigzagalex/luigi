-- +goose Up
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$ BEGIN
    CREATE TYPE reservation_status AS ENUM (
        "draft",
        "held", 
        "confirmed", 
        "out_for_pickup", 
        "in_use", 
        "returned", 
        "serviced", 
        "cancelled", 
        "expired", 
        "closed"
    );

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        "requires_payment_method",
        "requires_confirmation",
        "processing",
        "succeeded",
        "failed",
        "cancelled"
    );

EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- +goose Down
DROP TYPE IF payment_status;
DROP TYPE IF reservation_status;