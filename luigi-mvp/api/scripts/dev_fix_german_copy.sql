-- One-shot fix for German catalog copy and store display names in a running
-- dev database. Does not reset data.
--
-- Usage:
--   psql "$DATABASE_URL" -f api/scripts/dev_fix_german_copy.sql

BEGIN;

-- German store cities / names used in shop and admin selectors.
UPDATE stores
SET
  city = CASE
    WHEN city IN ('Geneva', 'Genève') OR name ILIKE '%Geneva%' THEN 'Genf'
    WHEN city IN ('Zurich', 'Zuerich') OR name ILIKE '%Zurich%' OR name ILIKE '%Zürich%' THEN 'Zürich'
    WHEN city = 'Bern' OR name ILIKE '%Bern%' THEN 'Bern'
    ELSE city
  END,
  name = CASE
    WHEN name ILIKE '%Geneva%' THEN replace(replace(name, 'Geneva', 'Genf'), 'Genève', 'Genf')
    WHEN name ILIKE '%Zurich%' THEN replace(name, 'Zurich', 'Zürich')
    ELSE name
  END
WHERE
  city IN ('Geneva', 'Genève', 'Zurich', 'Zuerich', 'Bern')
  OR name ILIKE '%Geneva%'
  OR name ILIKE '%Zurich%'
  OR name ILIKE '%Bern%';

-- Correct ASCII-transliterated umlauts in existing German product copy.
UPDATE product_translations
SET
  description = replace(description, 'fuer', 'für'),
  detailed_description = replace(detailed_description, 'fuer', 'für')
WHERE locale = 'de' AND (description LIKE '%fuer%' OR detailed_description LIKE '%fuer%');

UPDATE product_translations SET description = replace(description, 'Zuverlaessig', 'Zuverlässig'), detailed_description = replace(detailed_description, 'Zuverlaessig', 'Zuverlässig') WHERE locale = 'de' AND (description LIKE '%Zuverlaessig%' OR detailed_description LIKE '%Zuverlaessig%');
UPDATE product_translations SET detailed_description = replace(detailed_description, 'Uebersetzungsbereich', 'Übersetzungsbereich') WHERE locale = 'de' AND detailed_description LIKE '%Uebersetzungsbereich%';
UPDATE product_translations SET description = replace(description, 'Uebersetzung', 'Übersetzung'), detailed_description = replace(detailed_description, 'Uebersetzung', 'Übersetzung') WHERE locale = 'de' AND (description LIKE '%Uebersetzung%' OR detailed_description LIKE '%Uebersetzung%');
UPDATE product_translations SET detailed_description = replace(detailed_description, 'Uebersicht', 'Übersicht') WHERE locale = 'de' AND detailed_description LIKE '%Uebersicht%';
UPDATE product_translations SET description = replace(description, 'regelmaessig', 'regelmässig'), detailed_description = replace(detailed_description, 'regelmaessig', 'regelmässig') WHERE locale = 'de' AND (description LIKE '%regelmaessig%' OR detailed_description LIKE '%regelmaessig%');
UPDATE product_translations SET detailed_description = replace(detailed_description, 'Fahrgefuehl', 'Fahrgefühl') WHERE locale = 'de' AND detailed_description LIKE '%Fahrgefuehl%';
UPDATE product_translations SET detailed_description = replace(detailed_description, 'haeufige', 'häufige') WHERE locale = 'de' AND detailed_description LIKE '%haeufige%';
UPDATE product_translations SET description = replace(description, 'Praezis', 'Präzis'), detailed_description = replace(detailed_description, 'Praezis', 'Präzis') WHERE locale = 'de' AND (description LIKE '%Praezis%' OR detailed_description LIKE '%Praezis%');
UPDATE product_translations SET detailed_description = replace(detailed_description, 'praezise', 'präzise') WHERE locale = 'de' AND detailed_description LIKE '%praezise%';
UPDATE product_translations SET description = replace(description, 'taeglichen', 'täglichen'), detailed_description = replace(detailed_description, 'taeglichen', 'täglichen') WHERE locale = 'de' AND (description LIKE '%taeglichen%' OR detailed_description LIKE '%taeglichen%');
UPDATE product_translations SET detailed_description = replace(detailed_description, 'Gepaecktraeger', 'Gepäckträger') WHERE locale = 'de' AND detailed_description LIKE '%Gepaecktraeger%';
UPDATE product_translations SET detailed_description = replace(detailed_description, 'Sattelstuetze', 'Sattelstütze') WHERE locale = 'de' AND detailed_description LIKE '%Sattelstuetze%';
UPDATE product_translations SET detailed_description = replace(detailed_description, 'Verstaerkt', 'Verstärkt') WHERE locale = 'de' AND detailed_description LIKE '%Verstaerkt%';
UPDATE product_translations SET detailed_description = replace(detailed_description, 'Einsaetze', 'Einsätze') WHERE locale = 'de' AND detailed_description LIKE '%Einsaetze%';
UPDATE product_translations SET detailed_description = replace(detailed_description, 'Schlaege', 'Schläge') WHERE locale = 'de' AND detailed_description LIKE '%Schlaege%';
UPDATE product_translations SET detailed_description = replace(detailed_description, 'Untergruende', 'Untergründe') WHERE locale = 'de' AND detailed_description LIKE '%Untergruende%';
UPDATE product_translations SET detailed_description = replace(detailed_description, 'Stabilitaet', 'Stabilität') WHERE locale = 'de' AND detailed_description LIKE '%Stabilitaet%';
UPDATE product_translations SET detailed_description = replace(detailed_description, 'Gelaende', 'Gelände') WHERE locale = 'de' AND detailed_description LIKE '%Gelaende%';

COMMIT;
