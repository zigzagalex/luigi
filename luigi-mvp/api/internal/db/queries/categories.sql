-- name: CreateProductCategory :one
INSERT INTO product_categories (
    shop_id,
    parent_id,
    slug,
    name,
    description,
    sort_order,
    is_active
) VALUES (
    sqlc.arg(shop_id),                     
    sqlc.narg(parent_id)::bigint,          
    sqlc.arg(slug),                        
    sqlc.arg(name),                        
    sqlc.narg(description)::text,          
    COALESCE(sqlc.narg(sort_order)::int, 0),      
    COALESCE(sqlc.narg(is_active)::bool, TRUE)
)
RETURNING
    id,
    shop_id,
    parent_id,
    slug,
    name,
    description,
    sort_order,
    is_active,
    created_at,
    updated_at;


-- name: GetProductCategory :one
SELECT
    id,
    shop_id,
    parent_id,
    slug,
    name,
    description,
    sort_order,
    is_active,
    created_at,
    updated_at
FROM product_categories
WHERE id = sqlc.arg(id);


-- name: UpdateProductCategory :one
UPDATE product_categories
SET
    parent_id   = COALESCE(sqlc.narg(parent_id)::bigint, parent_id),
    slug        = COALESCE(sqlc.narg(slug)::text, slug),
    name        = COALESCE(sqlc.narg(name)::text, name),
    description = COALESCE(sqlc.narg(description)::text, description),
    sort_order  = COALESCE(sqlc.narg(sort_order)::int, sort_order),
    is_active   = COALESCE(sqlc.narg(is_active)::bool, is_active),
    updated_at  = now()
WHERE id = sqlc.arg(id)
RETURNING
    id,
    shop_id,
    parent_id,
    slug,
    name,
    description,
    sort_order,
    is_active,
    created_at,
    updated_at;


-- name: DeleteProductCategory :one
DELETE FROM product_categories
WHERE id = sqlc.arg(id)
RETURNING
    id,
    shop_id,
    parent_id,
    slug,
    name,
    description,
    sort_order,
    is_active,
    created_at,
    updated_at;


-- name: ListCategoriesByShop :many
SELECT
    id,
    shop_id,
    parent_id,
    slug,
    name,
    description,
    sort_order,
    is_active,
    created_at,
    updated_at
FROM product_categories
WHERE shop_id = sqlc.arg(shop_id)
ORDER BY sort_order, id;


-- name: AssignProductToCategory :exec
INSERT INTO product_category_assignments (product_id, category_id)
VALUES (sqlc.arg(product_id), sqlc.arg(category_id))
ON CONFLICT DO NOTHING;


-- name: ClearProductCategories :exec
DELETE FROM product_category_assignments
WHERE product_id = sqlc.arg(product_id);


-- name: ListCategoriesForProduct :many
SELECT
    c.id,
    c.shop_id,
    c.parent_id,
    c.slug,
    c.name,
    c.description,
    c.sort_order,
    c.is_active,
    c.created_at,
    c.updated_at
FROM product_categories c
JOIN product_category_assignments a
  ON a.category_id = c.id
WHERE a.product_id = sqlc.arg(product_id)
ORDER BY c.sort_order, c.id;
