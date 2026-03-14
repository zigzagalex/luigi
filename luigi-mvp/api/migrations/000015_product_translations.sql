-- +goose Up
CREATE TABLE product_translations (
  product_id   BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  locale       TEXT   NOT NULL, -- 'en', 'de', 'fr', 'it'
  name         TEXT   NOT NULL,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, locale)
);

CREATE INDEX idx_product_translations_locale ON product_translations(locale);

-- +goose Down
DROP INDEX IF EXISTS idx_product_translations_locale;
DROP TABLE IF EXISTS product_translations;