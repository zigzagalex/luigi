-- Local SQL seed when Firebase Admin session cookies are unavailable.
-- Assumes shop id=1 and stores 1..3 already exist.

BEGIN;

-- Price points (1–30 days) for bike + accessory categories
WITH rates(category, short_chf, mid_chf, long_chf) AS (
  VALUES
    ('standard', 50, 40, 30),
    ('professional', 80, 70, 60),
    ('accessory_compact', 6, 5, 4),
    ('accessory_standard', 11, 9, 7),
    ('accessory_premium', 17, 14, 11)
),
days AS (SELECT generate_series(1, 30) AS day_count)
INSERT INTO price_points (price_category, day_count, price_total_cents)
SELECT
  r.category,
  d.day_count,
  (CASE
     WHEN d.day_count <= 3 THEN r.short_chf
     WHEN d.day_count <= 7 THEN r.mid_chf
     ELSE r.long_chf
   END) * d.day_count * 100
FROM rates r
CROSS JOIN days d
ON CONFLICT (price_category, day_count) DO UPDATE
SET price_total_cents = EXCLUDED.price_total_cents;

-- Categories
INSERT INTO product_categories (shop_id, parent_id, slug, name, description, sort_order, is_active)
VALUES
  (1, NULL, 'mountain-bikes', 'Mountain Bikes', 'Off-road bikes', 10, true),
  (1, NULL, 'road-bikes', 'Road Bikes', 'Road and city bikes', 20, true),
  (1, NULL, 'accessories', 'Accessories', 'Add-ons', 30, true)
ON CONFLICT DO NOTHING;

-- Resolve category ids (slugs are unique per shop in practice; use subquery)
WITH roots AS (
  SELECT id, slug FROM product_categories WHERE shop_id = 1 AND parent_id IS NULL
)
INSERT INTO product_categories (shop_id, parent_id, slug, name, description, sort_order, is_active)
SELECT 1, r.id, v.slug, v.name, v.description, v.sort_order, true
FROM roots r
JOIN (VALUES
  ('mountain-bikes', 'hardtail', 'Hardtail', 'Hardtail MTB', 11),
  ('mountain-bikes', 'fully', 'Fully', 'Full suspension MTB', 12),
  ('road-bikes', 'endurance', 'Endurance', 'Endurance road', 21),
  ('road-bikes', 'race', 'Race', 'Race road', 22),
  ('accessories', 'helmets', 'Helmets', 'Helmets', 31),
  ('accessories', 'shoes', 'Shoes', 'Cycling shoes', 32)
) AS v(parent_slug, slug, name, description, sort_order)
  ON r.slug = v.parent_slug
WHERE NOT EXISTS (
  SELECT 1 FROM product_categories c WHERE c.shop_id = 1 AND c.slug = v.slug
);

-- Products (bikes)
INSERT INTO products (shop_id, sku, name, description, price_category, is_accessory, is_active)
VALUES
  (1, 'STD-MTB-TRAIL-1', 'Standard MTB Trail 1', 'Hardtail mountain bike for light trail riding.', 'standard', false, true),
  (1, 'STD-MTB-TRAIL-2', 'Standard MTB Trail 2', 'Entry-level full-suspension MTB.', 'standard', false, true),
  (1, 'STD-RD-END-1', 'Standard Road Endurance 1', 'Endurance road bike.', 'standard', false, true),
  (1, 'STD-RD-END-2', 'Standard Road Endurance 2', 'Comfort-focused road bike.', 'standard', false, true),
  (1, 'STD-RD-CITY-1', 'Standard Road City 1', 'City road bike.', 'standard', false, true),
  (1, 'PRO-MTB-END-1', 'Pro MTB Enduro 1', 'Enduro MTB.', 'professional', false, true),
  (1, 'PRO-MTB-DH-1', 'Pro MTB Downhill 1', 'Downhill MTB.', 'professional', false, true),
  (1, 'PRO-RD-RACE-1', 'Pro Road Race 1', 'Race road bike.', 'professional', false, true),
  (1, 'PRO-RD-AERO-1', 'Pro Road Aero 1', 'Aero road bike.', 'professional', false, true),
  (1, 'PRO-RD-GRAV-1', 'Pro Road Gravel 1', 'Gravel bike.', 'professional', false, true),
  (1, 'ACC-HELM-TRAIL', 'Trail Helmet', 'Ventilated trail helmet.', 'accessory_standard', true, true),
  (1, 'ACC-SHOE-MTB', 'MTB Shoes', 'Clipless MTB shoes.', 'accessory_premium', true, true)
ON CONFLICT (sku) DO NOTHING;

-- English translations
INSERT INTO product_translations (product_id, locale, name, description)
SELECT p.id, 'en', p.name, p.description
FROM products p
WHERE p.shop_id = 1
ON CONFLICT (product_id, locale) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description;

-- One variant per product
INSERT INTO product_variants (product_id, label, attributes, is_active)
SELECT p.id, 'M', '{"size":"M"}'::jsonb, true
FROM products p
WHERE p.shop_id = 1
  AND NOT EXISTS (
    SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.label = 'M'
  );

-- Category assignments
INSERT INTO product_category_assignments (product_id, category_id)
SELECT p.id, c.id
FROM products p
JOIN product_categories c ON c.shop_id = 1
WHERE p.shop_id = 1 AND (
  (p.sku LIKE 'STD-MTB%' AND c.slug = 'hardtail') OR
  (p.sku LIKE 'PRO-MTB%' AND c.slug = 'fully') OR
  (p.sku LIKE 'STD-RD%' AND c.slug = 'endurance') OR
  (p.sku LIKE 'PRO-RD%' AND c.slug = 'race') OR
  (p.sku LIKE 'ACC-HELM%' AND c.slug = 'helmets') OR
  (p.sku LIKE 'ACC-SHOE%' AND c.slug = 'shoes')
)
ON CONFLICT DO NOTHING;

-- Inventory: 2 items per variant per store
INSERT INTO inventory_items (
  shop_id, product_variant_id, store_id, tag_code, status, is_active
)
SELECT
  1,
  v.id,
  s.id,
  p.sku || '-S' || s.id::text || '-N' || n::text,
  'active',
  true
FROM product_variants v
JOIN products p ON p.id = v.product_id
CROSS JOIN stores s
CROSS JOIN generate_series(1, 2) AS n
WHERE p.shop_id = 1 AND s.shop_id = 1
  AND NOT EXISTS (
    SELECT 1 FROM inventory_items i
    WHERE i.tag_code = p.sku || '-S' || s.id::text || '-N' || n::text
  );

COMMIT;

SELECT 'shops' AS entity, count(*)::int AS n FROM shops
UNION ALL SELECT 'stores', count(*)::int FROM stores
UNION ALL SELECT 'products', count(*)::int FROM products
UNION ALL SELECT 'variants', count(*)::int FROM product_variants
UNION ALL SELECT 'inventory', count(*)::int FROM inventory_items
UNION ALL SELECT 'price_points', count(*)::int FROM price_points
UNION ALL SELECT 'categories', count(*)::int FROM product_categories;
