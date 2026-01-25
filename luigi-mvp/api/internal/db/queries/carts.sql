-- name: GetOpenCartByCustomerID :one
SELECT *
FROM carts
WHERE customer_id = sqlc.arg(customer_id)::bigint
  AND shop_id     = sqlc.arg(shop_id)::bigint
  AND status = 'open'
LIMIT 1;


-- name: GetOpenCartBySessionID :one
SELECT *
FROM carts
WHERE session_id = sqlc.arg(session_id)::text
  AND shop_id = sqlc.arg(shop_id)::bigint
  AND status = 'open'
LIMIT 1;

-- name: CreateCartForCustomer :one
INSERT INTO carts (
  shop_id,
  customer_id,
  session_id,
  status,
  expires_at
)
VALUES (
  sqlc.arg(shop_id)::bigint,
  sqlc.arg(customer_id)::bigint,
  NULL,
  'open',
  sqlc.arg(expires_at)
)
RETURNING *;


-- name: CreateCartForSession :one
INSERT INTO carts (
  shop_id,
  customer_id,
  session_id,
  status,
  expires_at
)
VALUES (
  sqlc.arg(shop_id)::bigint,
  NULL,
  sqlc.arg(session_id)::text,
  'open',
  sqlc.arg(expires_at)
)
RETURNING *;


-- name: TouchCartUpdatedAt :exec
UPDATE carts
SET updated_at = now()
WHERE id = sqlc.arg(cart_id);

-- name: UpdateCartStore :exec
UPDATE carts
SET store_id = sqlc.arg(store_id),
    updated_at = now()
WHERE id = sqlc.arg(cart_id);

-- name: UpdateCartStatus :exec
UPDATE carts
SET status = sqlc.arg(status)::cart_status,
    updated_at = now()
WHERE id = sqlc.arg(cart_id);

-- name: ExpireOpenCarts :exec
UPDATE carts
SET status = 'expired',
    updated_at = now()
WHERE status = 'open'
  AND expires_at <= now();

-- name: GetCartByID :one
SELECT *
FROM carts
WHERE id = sqlc.arg(cart_id)
LIMIT 1;

-- One open cart per customer per shop
CREATE UNIQUE INDEX ux_open_cart_customer_shop
ON carts (customer_id, shop_id)
WHERE customer_id IS NOT NULL AND status = 'open';

-- One open cart per guest session per shop
CREATE UNIQUE INDEX ux_open_cart_session_shop
ON carts (session_id, shop_id)
WHERE session_id IS NOT NULL AND status = 'open';


-- -------------------------------------------------------
-- Cart items
-- -------------------------------------------------------

-- name: ListCartItems :many
SELECT *
FROM cart_items
WHERE cart_id = sqlc.arg(cart_id)
ORDER BY id ASC;

-- name: GetCartItemByID :one
SELECT *
FROM cart_items
WHERE id = sqlc.arg(cart_item_id)
LIMIT 1;

-- name: CreateCartItem :one
INSERT INTO cart_items (
  cart_id,
  product_id,
  variant_id,
  inventory_item_id,
  start_at,
  end_at,
  unit_price_cents,
  currency,
  quantity
)
VALUES (
  sqlc.arg(cart_id),
  sqlc.arg(product_id),
  sqlc.arg(variant_id),
  sqlc.arg(inventory_item_id),
  sqlc.arg(start_at),
  sqlc.arg(end_at),
  sqlc.arg(unit_price_cents),
  sqlc.arg(currency),
  sqlc.arg(quantity)
)
RETURNING *;

-- name: UpdateCartItemCore :exec
UPDATE cart_items
SET
  start_at = sqlc.arg(start_at),
  end_at = sqlc.arg(end_at),
  unit_price_cents = sqlc.arg(unit_price_cents),
  currency = sqlc.arg(currency),
  quantity = sqlc.arg(quantity)
WHERE id = sqlc.arg(cart_item_id);

-- name: DeleteCartItem :exec
DELETE FROM cart_items
WHERE id = sqlc.arg(cart_item_id);

-- name: CartTotals :one
SELECT
  COALESCE(SUM(unit_price_cents * quantity), 0)::bigint AS subtotal_cents,
  COALESCE(MIN(currency), 'CHF')::text             AS currency
FROM cart_items
WHERE cart_id = sqlc.arg(cart_id);


-- name: GetCartItemWithCart :one
SELECT
  ci.*,
  c.id        AS cart_id,
  c.status    AS cart_status,
  c.shop_id   AS cart_shop_id,
  c.store_id  AS cart_store_id,
  c.customer_id AS cart_customer_id,
  c.session_id  AS cart_session_id
FROM cart_items ci
JOIN carts c ON c.id = ci.cart_id
WHERE ci.id = sqlc.arg(cart_item_id)
LIMIT 1;


-- name: AttachCartToCustomer :exec
UPDATE carts
SET customer_id = sqlc.arg(customer_id)::bigint,
    session_id = NULL,
    updated_at = now()
WHERE id = sqlc.arg(cart_id)::bigint
  AND status = 'open';
