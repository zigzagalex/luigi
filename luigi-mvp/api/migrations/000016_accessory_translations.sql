-- +goose Up
CREATE TABLE accessory_translations (
  accessory_id   BIGINT NOT NULL REFERENCES accessories(id) ON DELETE CASCADE,
  locale       TEXT   NOT NULL, -- 'en', 'de', 'fr', 'it'
  name         TEXT   NOT NULL,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (accessory_id, locale)
);

CREATE INDEX idx_accessory_translations_locale ON accessory_translations(locale);

-- +goose Down
DROP INDEX IF EXISTS idx_accessory_translations_locale;
DROP TABLE IF EXISTS accessory_translations;