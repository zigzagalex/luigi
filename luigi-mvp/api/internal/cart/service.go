package cart

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/zigzagalex/luigi/api/internal/availability"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
)

var (
	ErrNoOwner           = errors.New("no owner (no customer_id and no session_id)")
	ErrCartNotFound      = errors.New("cart not found")
	ErrCartItemNotFound  = errors.New("cart item not found")
	ErrNotYourCart       = errors.New("cart does not belong to current owner")
	ErrCartNotOpen       = errors.New("cart is not open")
	ErrInvalidRange      = errors.New("invalid rental range")
	ErrInvalidQuantity   = errors.New("quantity must be > 0")
	ErrInsufficientStock = errors.New("insufficient stock for requested range")
)

type Owner struct {
	CustomerID *int64
	SessionID  *string
}

type Service struct {
	q  *db.Queries
	db *sql.DB
	av *availability.Service
}

func NewService(q *db.Queries, sqlDB *sql.DB, av *availability.Service) *Service {
	return &Service{q: q, db: sqlDB, av: av}
}

type CartView struct {
	Cart          db.Cart       `json:"cart"`
	Items         []db.CartItem `json:"items"`
	SubtotalCents int64         `json:"subtotal_cents"`
	Currency      string        `json:"currency"`
}

func (s *Service) GetCart(ctx context.Context, owner Owner, shopID, storeID int64) (*CartView, error) {
	c, err := s.getOrCreateOpenCart(ctx, owner, shopID, storeID)
	if err != nil {
		return nil, err
	}
	return s.buildCartView(ctx, c.ID)
}

type AddItemInput struct {
	ShopID    int64
	StoreID   int64
	ProductID int64
	VariantID int64
	StartAt   time.Time
	EndAt     time.Time

	// "Quantity" = number of physical inventory items to add.
	// one cart_item per inventory_item, so this becomes "create N rows".
	Quantity int32
}

func (s *Service) AddItem(ctx context.Context, owner Owner, in AddItemInput) (*CartView, error) {
	if in.Quantity <= 0 {
		return nil, ErrInvalidQuantity
	}
	if !in.StartAt.Before(in.EndAt) {
		return nil, ErrInvalidRange
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	qtx := s.q.WithTx(tx)

	// 1) Get or create open cart for this owner
	cartRow, err := s.getOrCreateOpenCartTx(ctx, qtx, owner, in.ShopID, in.StoreID)
	if err != nil {
		return nil, err
	}

	// 2) Allocate N concrete inventory items that are free for [start,end)
	allocParams := db.AllocateInventoryItemsForHoldParams{
		ProductVariantID: in.VariantID,
		StoreID:          in.StoreID,
		StartAt:          in.StartAt,
		EndAt:            in.EndAt,
		LimitN:           in.Quantity,
	}
	invIDs, err := qtx.AllocateInventoryItemsForHold(ctx, &allocParams)
	if err != nil {
		return nil, err
	}
	if int32(len(invIDs)) != in.Quantity {
		return nil, ErrInsufficientStock
	}

	// 3) For each allocated inventory item:
	//    - quote price for quantity=1 (simple and avoids division assumptions)
	//    - insert cart_item with quantity=1
	//    - create hold tied to cart_item (1:1)
	holdExpires := time.Now().Add(15 * time.Second)

	var customerID sql.NullInt64
	if owner.CustomerID != nil {
		customerID = sql.NullInt64{Int64: *owner.CustomerID, Valid: true}
	}

	for _, invID := range invIDs {
		quote, err := s.av.Quote(ctx, availability.QuoteInput{
			ProductVariantID: in.VariantID,
			StoreID:          in.StoreID,
			StartAt:          in.StartAt,
			EndAt:            in.EndAt,
			Quantity:         1,
		})
		if err != nil {
			return nil, fmt.Errorf("quote failed: %w", err)
		}

		unitPriceCents := int32(quote.PriceTotalCents)

		item, err := qtx.CreateCartItem(ctx, &db.CreateCartItemParams{
			CartID:          cartRow.ID,
			ProductID:       sql.NullInt64{Int64: in.ProductID, Valid: true},
			VariantID:       sql.NullInt64{Int64: in.VariantID, Valid: true},
			InventoryItemID: invID,
			StartAt:         in.StartAt,
			EndAt:           in.EndAt,
			UnitPriceCents:  unitPriceCents,
			Currency:        quote.Currency,
			Quantity:        1, // one cart_item per physical inventory item
		})
		if err != nil {
			return nil, err
		}

		_, err = qtx.CreateHoldForCartItem(ctx, &db.CreateHoldForCartItemParams{
			ShopID:          in.ShopID,
			StoreID:         in.StoreID,
			CustomerID:      customerID,
			InventoryItemID: invID,
			StartAt:         in.StartAt,
			EndAt:           in.EndAt,
			ExpiresAt:       holdExpires,
			CartID:          sql.NullInt64{Int64: cartRow.ID, Valid: true},
			CartItemID:      sql.NullInt64{Int64: item.ID, Valid: true},
		})
		if err != nil {
			return nil, err
		}
	}

	if err := qtx.TouchCartUpdatedAt(ctx, cartRow.ID); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return s.buildCartView(ctx, cartRow.ID)
}

type UpdateItemInput struct {
	ShopID     int64
	StoreID    int64
	CartItemID int64
	StartAt    time.Time
	EndAt      time.Time

	// In the "one cart_item per inventory item" model, this MUST be 1.
	// If the UI wants "2 bikes" it should have 2 cart_items.
	Quantity int32
}

func (s *Service) UpdateItem(ctx context.Context, owner Owner, in UpdateItemInput) (*CartView, error) {
	if in.Quantity <= 0 {
		return nil, ErrInvalidQuantity
	}
	if in.Quantity != 1 {
		return nil, errors.New("cart item quantity must be 1 (one cart_item per inventory item)")
	}
	if !in.StartAt.Before(in.EndAt) {
		return nil, ErrInvalidRange
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	qtx := s.q.WithTx(tx)

	// Fetch cart item + cart metadata (ownership + status)
	row, err := qtx.GetCartItemWithCart(ctx, in.CartItemID)
	if err != nil {
		return nil, ErrCartItemNotFound
	}
	if row.CartStatus != "open" {
		return nil, ErrCartNotOpen
	}

	// Ownership check
	if err := assertOwner(owner, row.CartCustomerID, row.CartSessionID); err != nil {
		return nil, err
	}

	if !row.VariantID.Valid {
		return nil, errors.New("cart item missing variant_id")
	}

	// IMPORTANT:
	// We keep the SAME inventory_item_id (same physical bike).
	// If it isn't available for the new dates, we fail the update.
	// (Alternative is to re-allocate + swap inventory item. We are NOT doing that here.)
	//
	// So we check availability by trying to create a hold after deleting the old one.
	// But we must ensure we don't lose the old hold if the new one can't be created.
	//
	// Simplest safe approach:
	// - delete old hold
	// - attempt insert new hold on same inventory id
	// - if insert fails due to conflict, rollback tx => old hold returns

	quote, err := s.av.Quote(ctx, availability.QuoteInput{
		ProductVariantID: row.VariantID.Int64,
		StoreID:          in.StoreID,
		StartAt:          in.StartAt,
		EndAt:            in.EndAt,
		Quantity:         1,
	})
	if err != nil {
		return nil, fmt.Errorf("quote failed: %w", err)
	}
	unitPriceCents := int32(quote.PriceTotalCents)

	// Remove existing hold for this cart_item (should be 1 row)
	if err := qtx.DeleteHoldsByCartItem(ctx, in.CartItemID); err != nil {
		return nil, err
	}

	holdExpires := time.Now().Add(15 * time.Minute)

	var customerID sql.NullInt64
	if owner.CustomerID != nil {
		customerID = sql.NullInt64{Int64: *owner.CustomerID, Valid: true}
	}

	// Re-create hold for SAME inventory item
	_, err = qtx.CreateHoldForCartItem(ctx, &db.CreateHoldForCartItemParams{
		ShopID:          in.ShopID,
		StoreID:         in.StoreID,
		CustomerID:      customerID,
		InventoryItemID: row.InventoryItemID,
		StartAt:         in.StartAt,
		EndAt:           in.EndAt,
		ExpiresAt:       holdExpires,
		CartID:          sql.NullInt64{Int64: row.CartID, Valid: true},
		CartItemID:      sql.NullInt64{Int64: row.ID, Valid: true},
	})
	if err != nil {
		// If this fails, tx rollback restores old hold (since we deleted it inside tx)
		return nil, err
	}

	// Update cart item snapshot fields
	if err := qtx.UpdateCartItemCore(ctx, &db.UpdateCartItemCoreParams{
		CartItemID:     in.CartItemID,
		StartAt:        in.StartAt,
		EndAt:          in.EndAt,
		UnitPriceCents: unitPriceCents,
		Currency:       quote.Currency,
		Quantity:       1,
	}); err != nil {
		return nil, err
	}

	if err := qtx.TouchCartUpdatedAt(ctx, row.CartID); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return s.buildCartView(ctx, row.CartID)
}

func (s *Service) DeleteItem(ctx context.Context, owner Owner, cartItemID int64) (*CartView, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	qtx := s.q.WithTx(tx)

	row, err := qtx.GetCartItemWithCart(ctx, cartItemID)
	if err != nil {
		return nil, ErrCartItemNotFound
	}
	if row.CartStatus != "open" {
		return nil, ErrCartNotOpen
	}
	if err := assertOwner(owner, row.CartCustomerID, row.CartSessionID); err != nil {
		return nil, err
	}

	// Cascades holds because holds.cart_item_id references cart_items(id) ON DELETE CASCADE
	if err := qtx.DeleteCartItem(ctx, cartItemID); err != nil {
		return nil, err
	}
	if err := qtx.TouchCartUpdatedAt(ctx, row.CartID); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return s.buildCartView(ctx, row.CartID)
}

// ------------------- helpers -------------------

func assertOwner(owner Owner, cartCustomerID sql.NullInt64, cartSessionID sql.NullString) error {
	if owner.CustomerID != nil {
		if !cartCustomerID.Valid || cartCustomerID.Int64 != *owner.CustomerID {
			return ErrNotYourCart
		}
		return nil
	}
	if owner.SessionID != nil {
		if !cartSessionID.Valid || cartSessionID.String != *owner.SessionID {
			return ErrNotYourCart
		}
		return nil
	}
	return ErrNoOwner
}

func (s *Service) buildCartView(ctx context.Context, cartID int64) (*CartView, error) {
	cartRow, err := s.q.GetCartByID(ctx, cartID)
	if err != nil {
		return nil, err
	}

	items, err := s.q.ListCartItems(ctx, cartID)
	if err != nil {
		return nil, err
	}

	totals, err := s.q.CartTotals(ctx, cartID)
	if err != nil {
		return nil, err
	}

	return &CartView{
		Cart:          cartRow,
		Items:         items,
		SubtotalCents: totals.SubtotalCents,
		Currency:      totals.Currency,
	}, nil
}

func (s *Service) getOrCreateOpenCart(ctx context.Context, owner Owner, shopID, storeID int64) (db.Cart, error) {
	if owner.CustomerID == nil && owner.SessionID == nil {
		return db.Cart{}, ErrNoOwner
	}

	if owner.CustomerID != nil {
		c, err := s.q.GetOpenCartByCustomerID(ctx, *owner.CustomerID)
		if err == nil {
			return c, nil
		}
		exp := time.Now().Add(2 * time.Hour)
		return s.q.CreateCartForCustomer(ctx, &db.CreateCartForCustomerParams{
			ShopID:     shopID,
			StoreID:    storeID,
			CustomerID: *owner.CustomerID,
			ExpiresAt:  exp,
		})
	}

	c, err := s.q.GetOpenCartBySessionID(ctx, *owner.SessionID)
	if err == nil {
		return c, nil
	}
	exp := time.Now().Add(2 * time.Hour)
	return s.q.CreateCartForSession(ctx, &db.CreateCartForSessionParams{
		ShopID:    shopID,
		StoreID:   storeID,
		SessionID: *owner.SessionID,
		ExpiresAt: exp,
	})
}

func (s *Service) getOrCreateOpenCartTx(ctx context.Context, qtx *db.Queries, owner Owner, shopID, storeID int64) (db.Cart, error) {
	if owner.CustomerID == nil && owner.SessionID == nil {
		return db.Cart{}, ErrNoOwner
	}

	if owner.CustomerID != nil {
		c, err := qtx.GetOpenCartByCustomerID(ctx, *owner.CustomerID)
		if err == nil {
			return c, nil
		}
		exp := time.Now().Add(2 * time.Hour)
		return qtx.CreateCartForCustomer(ctx, &db.CreateCartForCustomerParams{
			ShopID:     shopID,
			StoreID:    storeID,
			CustomerID: *owner.CustomerID,
			ExpiresAt:  exp,
		})
	}

	c, err := qtx.GetOpenCartBySessionID(ctx, *owner.SessionID)
	if err == nil {
		return c, nil
	}
	exp := time.Now().Add(2 * time.Hour)
	return qtx.CreateCartForSession(ctx, &db.CreateCartForSessionParams{
		ShopID:    shopID,
		StoreID:   storeID,
		SessionID: *owner.SessionID,
		ExpiresAt: exp,
	})
}
