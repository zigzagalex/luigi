-- name: UpsertProductTranslation :one
INSERT INTO product_translations (
    product_id, locale, name, description, detailed_description, updated_at
) VALUES (
    sqlc.arg(product_id),
    sqlc.arg(locale),
    sqlc.arg(name),
    sqlc.narg(description),
    sqlc.narg(detailed_description),
    now()
)
ON CONFLICT (product_id, locale) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    detailed_description = EXCLUDED.detailed_description,
    updated_at = now()
RETURNING *;

-- name: GetProductTranslations :many
SELECT * FROM product_translations 
WHERE product_id = sqlc.arg(product_id)
ORDER BY locale;

-- name: DeleteProductTranslation :exec
DELETE FROM product_translations 
WHERE product_id = sqlc.arg(product_id) AND locale = sqlc.arg(locale);

-- name: UpsertAccessoryTranslation :one
INSERT INTO accessory_translations (
    accessory_id, locale, name, description, updated_at
) VALUES (
    sqlc.arg(accessory_id),
    sqlc.arg(locale),
    sqlc.arg(name),
    sqlc.narg(description),
    now()
)
ON CONFLICT (accessory_id, locale) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = now()
RETURNING *;

-- name: GetAccessoryTranslations :many
SELECT * FROM accessory_translations 
WHERE accessory_id = sqlc.arg(accessory_id);