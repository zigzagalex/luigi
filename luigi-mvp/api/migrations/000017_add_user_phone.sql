-- +goose Up
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone text;

-- +goose Down
ALTER TABLE users
DROP COLUMN IF EXISTS phone;