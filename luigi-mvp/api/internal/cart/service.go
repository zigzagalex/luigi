package cart

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/zigzagalex/luigi/api/internal/availability"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	stores "github.com/zigzagalex/luigi/api/internal/stores"
	u "github.com/zigzagalex/luigi/api/internal/utils"
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
	ErrDifferentStore    = errors.New("cart contains items from a different store")
)

type Owner struct {
	CustomerID *int64
	SessionID  *string
}

type Service struct {
	q  *db.Queries
	db *sql.DB
	av *availability.Service
	st *stores.Service
}

func NewService(q *db.Queries, sqlDB *sql.DB, av *availability.Service, st *stores.Service) *Service {
	return &Service{q: q, db: sqlDB, av: av, st: st}
}

type CartItemView struct {
	db.CartItem

	// Computed flags for UI + checkout enforcement
	IsExpired   bool   `json:"is_expired"`
	IsAvailable bool   `json:"is_available"`
	Blocked     bool   `json:"blocked"`
	Reason      string `json:"reason,omitempty"` // e.g. "start_date_in_past" | "not_available"
}

type CartView struct {
	Cart            db.Cart        `json:"cart"`
	Items           []CartItemView `json:"items"`
	StoreID         int64          `json:"store_id"`
	StoreName       string         `json:"store_name"`
	StoreAddress    string         `json:"store_address"`
	StorePostalCode string         `json:"store_postalcode"`
	StoreCity       string         `json:"store_city"`
	SubtotalCents   int64          `json:"subtotal_cents"`
	Currency        string         `json:"currency"`
}

func (s *Service) GetCart(ctx context.Context, owner Owner, shopID int64) (*CartView, error) {
	c, err := s.getOrCreateOpenCart(ctx, owner, shopID)
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
	cartRow, err := s.getOrCreateOpenCartTx(ctx, qtx, owner, in.ShopID)
	if err != nil {
		return nil, err
	}

	// Enforce single-store-per-cart invariant

	// If cart has no store yet (first item), set it
	if cartRow.StoreID.Int64 == 0 {
		if err := qtx.UpdateCartStoreID(ctx, &db.UpdateCartStoreIDParams{
			ID:      cartRow.ID,
			StoreID: in.StoreID,
		}); err != nil {
			return nil, err
		}
		StoreID := u.ToNullInt64(&in.StoreID)
		// keep cartRow in sync locally
		cartRow.StoreID = StoreID
	} else {
		// Cart already has store, enforce match
		StoreID := u.ToNullInt64(&in.StoreID)
		if cartRow.StoreID != StoreID {
			return nil, ErrDifferentStore
		}
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
	holdExpires := time.Now().Add(0 * time.Second) // ignore holds for now

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
	// Check if cart is now empty
	count, err := qtx.CountCartItems(ctx, row.CartID)
	if err != nil {
		return nil, err
	}

	if count == 0 {
		if err := qtx.ClearCartStoreID(ctx, row.CartID); err != nil {
			return nil, err
		}
	}
	if err := qtx.TouchCartUpdatedAt(ctx, row.CartID); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return s.buildCartView(ctx, row.CartID)
}

func (s *Service) AttachGuestCartToCustomer(
	ctx context.Context,
	shopID int64,
	guestSessionID string,
	customerID int64,
) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	qtx := s.q.WithTx(tx)

	// 1) Load guest cart (may not exist)
	var guestCart db.Cart
	guestCart, err = qtx.GetOpenCartBySessionID(ctx, &db.GetOpenCartBySessionIDParams{
		SessionID: guestSessionID,
		ShopID:    shopID,
	})
	guestFound := true
	if err != nil {
		if err == sql.ErrNoRows {
			guestFound = false
		} else {
			return err
		}
	}

	// 2) Load customer cart (may not exist)
	var customerCart db.Cart
	customerCart, err = qtx.GetOpenCartByCustomerID(ctx, &db.GetOpenCartByCustomerIDParams{
		CustomerID: customerID,
		ShopID:     shopID,
	})
	customerFound := true
	if err != nil {
		if err == sql.ErrNoRows {
			customerFound = false
		} else {
			return err
		}
	}

	// 3) Decide winner: guest cart wins only if it exists AND has items
	guestHasItems := false
	if guestFound {
		n, err := qtx.CountCartItems(ctx, guestCart.ID) //
		if err != nil {
			return err
		}
		guestHasItems = n > 0
	}

	if guestHasItems {
		// Guest wins:
		// - abandon customer's existing cart (if different)
		if customerFound && customerCart.ID != guestCart.ID {
			if err := qtx.UpdateCartStatus(ctx, &db.UpdateCartStatusParams{
				CartID: customerCart.ID,
				Status: "abandoned",
			}); err != nil {
				return err
			}
		}

		// - attach guest cart to customer
		if err := qtx.AttachCartToCustomer(ctx, &db.AttachCartToCustomerParams{
			CartID:     guestCart.ID,
			CustomerID: customerID,
			StoreID:    guestCart.StoreID.Int64,
		}); err != nil {
			return err
		}

		return tx.Commit()
	}

	// Guest empty (or missing) => customer wins:
	// Do NOT overwrite customer cart.
	if guestFound && (!customerFound || guestCart.ID != customerCart.ID) {
		_ = qtx.UpdateCartStatus(ctx, &db.UpdateCartStatusParams{
			CartID: guestCart.ID,
			Status: "abandoned",
		})
	}

	return tx.Commit()
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

	// ---- compute expired threshold (Zurich midnight) ----
	loc, _ := time.LoadLocation("Europe/Zurich")
	now := time.Now().In(loc)
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)

	// ---- batch-check availability of each inventory item ----
	checks := make([]availability.CheckInput, 0, len(items))
	for _, it := range items {
		checks = append(checks, availability.CheckInput{
			InventoryItemID: it.InventoryItemID,
			StartAt:         it.StartAt,
			EndAt:           it.EndAt,
		})
		log.Printf("%v, %v", it.StartAt, it.EndAt)
	}

	availByInvID := map[int64]bool{}
	if s.av != nil && len(checks) > 0 {
		availByInvID, err = s.av.CheckMany(ctx, checks)
		if err != nil {
			return nil, err
		}
	}

	outItems := make([]CartItemView, 0, len(items))
	for _, it := range items {
		expired := it.StartAt.Before(todayStart)
		available := true
		if s.av != nil {
			// if missing from map, treat as not available (safer)
			v, ok := availByInvID[it.InventoryItemID]
			available = ok && v
		}

		reason := ""
		blocked := false

		if expired {
			blocked = true
			reason = "start_date_in_past"
			available = false
		} else if !available {
			blocked = true
			reason = "not_available"
		}

		outItems = append(outItems, CartItemView{
			CartItem:    it,
			IsExpired:   expired,
			IsAvailable: available,
			Blocked:     blocked,
			Reason:      reason,
		})
	}

	var storeId int64
	var storeName string
	var storeAddress string
	var storePostalCode string
	var storeCity string
	if cartRow.StoreID.Valid {
		store, err := s.st.GetStoreById(ctx, cartRow.StoreID.Int64)
		if err == nil {
			storeId = store.ID
			storeName = store.Name
			storeAddress = store.Address1.String
			storePostalCode = store.PostalCode.String
			storeCity = store.City.String
		}
	}

	return &CartView{
		Cart:            cartRow,
		Items:           outItems,
		StoreID:         storeId,
		StoreName:       storeName,
		StoreAddress:    storeAddress,
		StorePostalCode: storePostalCode,
		StoreCity:       storeCity,
		SubtotalCents:   totals.SubtotalCents,
		Currency:        totals.Currency,
	}, nil
}

func (s *Service) getOrCreateOpenCart(
	ctx context.Context,
	owner Owner,
	shopID int64,
) (db.Cart, error) {

	if owner.CustomerID != nil {
		c, err := s.q.GetOpenCartByCustomerID(ctx, &db.GetOpenCartByCustomerIDParams{
			CustomerID: *owner.CustomerID,
			ShopID:     shopID,
		})
		if err == nil {
			return c, nil
		}

		return s.q.CreateCartForCustomer(ctx, &db.CreateCartForCustomerParams{
			ShopID:     shopID,
			CustomerID: *owner.CustomerID,
			ExpiresAt:  time.Now().Add(2 * time.Hour),
		})
	}

	if owner.SessionID != nil {
		c, err := s.q.GetOpenCartBySessionID(ctx, &db.GetOpenCartBySessionIDParams{
			SessionID: *owner.SessionID,
			ShopID:    shopID,
		})
		if err == nil {
			return c, nil
		}

		return s.q.CreateCartForSession(ctx, &db.CreateCartForSessionParams{
			ShopID:    shopID,
			SessionID: *owner.SessionID,
			ExpiresAt: time.Now().Add(2 * time.Hour),
		})
	}

	return db.Cart{}, ErrNoOwner
}

func (s *Service) getOrCreateOpenCartTx(ctx context.Context, qtx *db.Queries, owner Owner, shopID int64) (db.Cart, error) {
	if owner.CustomerID == nil && owner.SessionID == nil {
		return db.Cart{}, ErrNoOwner
	}

	if owner.CustomerID != nil {
		c, err := qtx.GetOpenCartByCustomerID(ctx, &db.GetOpenCartByCustomerIDParams{
			CustomerID: *owner.CustomerID,
			ShopID:     shopID,
		})
		if err == nil {
			return c, nil
		}
		exp := time.Now().Add(2 * time.Hour)
		return qtx.CreateCartForCustomer(ctx, &db.CreateCartForCustomerParams{
			ShopID:     shopID,
			CustomerID: *owner.CustomerID,
			ExpiresAt:  exp,
		})
	}

	c, err := qtx.GetOpenCartBySessionID(ctx, &db.GetOpenCartBySessionIDParams{
		SessionID: *owner.SessionID,
		ShopID:    shopID,
	})
	if err == nil {
		return c, nil
	}
	exp := time.Now().Add(2 * time.Hour)
	return qtx.CreateCartForSession(ctx, &db.CreateCartForSessionParams{
		ShopID:    shopID,
		SessionID: *owner.SessionID,
		ExpiresAt: exp,
	})
}
