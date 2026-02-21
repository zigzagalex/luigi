package reservation

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/lib/pq"
	"github.com/sqlc-dev/pqtype"
	"github.com/zigzagalex/luigi/api/internal/cart"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/images"
)

var (
	ErrReservationNotFound   = errors.New("reservation not found")
	ErrCartEmpty             = errors.New("cart is empty")
	ErrCartBlocked           = errors.New("cart has blocked items")
	ErrInvalidRange          = errors.New("invalid reservation range")
	ErrOptimisticLock        = errors.New("reservation version conflict")
	ErrReservationNotActive  = errors.New("reservation is not active")
	ErrNotAvailableForDates  = errors.New("inventory not available for selected dates")
	ErrIdempotencyKeyMissing = errors.New("idempotency_key required")
)

type Service struct {
	q      *db.Queries
	db     *sql.DB
	cart   *cart.Service
	images *images.Service
}

func NewService(q *db.Queries, sqlDB *sql.DB, cartSvc *cart.Service, imageSvc *images.Service) *Service {
	return &Service{q: q, db: sqlDB, cart: cartSvc, images: imageSvc}
}

//
// -------------------- DTOs --------------------
//

// StoreView is a clean JSON shape (no sql.NullString wrappers).
type StoreView struct {
	ID         int64  `json:"id"`
	Name       string `json:"name"`
	Address1   string `json:"address1"`
	PostalCode string `json:"postal_code"`
	City       string `json:"city"`
}

// ReservationDTO is the API-facing reservation representation.
// Optional fields are pointers => JSON null when absent (or omitted if you add omitempty).
type ReservationDTO struct {
	ID       int64  `json:"id"`
	ShopID   int64  `json:"shop_id"`
	StoreID  int64  `json:"store_id"`
	Status   string `json:"status"`
	Currency string `json:"currency"`

	CustomerID      *int64  `json:"customer_id"`
	StartAt         string  `json:"start_at"`
	EndAt           string  `json:"end_at"`
	TotalPriceCents int64   `json:"total_price_cents"`
	IdempotencyKey  *string `json:"idempotency_key"`
	Version         int32   `json:"version"`

	Notes             *string `json:"notes"`
	PickupPersonName  *string `json:"pickup_person_name"`
	PickupPersonPhone *string `json:"pickup_person_phone"`
	PickupPersonEmail *string `json:"pickup_person_email"`

	CancelledAt  *string `json:"cancelled_at"`
	CancelReason *string `json:"cancel_reason"`

	StoreSnapshotName *string `json:"store_snapshot_name"`

	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// ReservationItemDTO is the API-facing reservation item representation.
type ReservationItemDTO struct {
	ID              int64 `json:"id"`
	ReservationID   int64 `json:"reservation_id"`
	InventoryItemID int64 `json:"inventory_item_id"`

	ProductID      *int64 `json:"product_id"`
	VariantID      *int64 `json:"variant_id"`
	IsActive       bool   `json:"is_active"`
	UnitPriceCents int64  `json:"unit_price_cents"`
	Quantity       int32  `json:"quantity"`
	Currency       string `json:"currency"`

	// If you want to surface range(s) later, add them here as strings.
	// Keeping this out avoids leaking pq/sql internal types.
}

// ReservationItemView is the enriched API-facing item (clean DTO + optional enrichment).
type ReservationItemView struct {
	ReservationItem ReservationItemDTO `json:"reservation_item"`
	ProductID       *int64             `json:"product_id,omitempty"`
	VariantID       *int64             `json:"variant_id,omitempty"`
	ProductName     string             `json:"product_name,omitempty"`
	VariantText     string             `json:"variant_text,omitempty"`
	ImageURL        string             `json:"image_url,omitempty"`
}

// ReservationView is the top-level response: reservation + items + (optional) store.
type ReservationView struct {
	Reservation ReservationDTO        `json:"reservation"`
	Items       []ReservationItemView `json:"items"`
	Store       *StoreView            `json:"store,omitempty"`
}

//
// -------------------- Null helpers --------------------
//

func ptrString(ns sql.NullString) *string {
	if !ns.Valid {
		return nil
	}
	v := ns.String
	if strings.TrimSpace(v) == "" {
		return nil
	}
	return &v
}

func ptrInt64(ni sql.NullInt64) *int64 {
	if !ni.Valid {
		return nil
	}
	v := ni.Int64
	return &v
}

func ptrTime(nt sql.NullTime) *string {
	if !nt.Valid {
		return nil
	}
	s := nt.Time.UTC().Format(time.RFC3339Nano)
	return &s
}

func timeStr(t time.Time) string {
	return t.UTC().Format(time.RFC3339Nano)
}

// For incoming optional strings in requests
func toNullString(p *string) sql.NullString {
	if p == nil {
		return sql.NullString{}
	}
	if strings.TrimSpace(*p) == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: strings.TrimSpace(*p), Valid: true}
}

//
// -------------------- Mapping db -> DTO --------------------
//

func toReservationDTO(r db.Reservation) ReservationDTO {
	return ReservationDTO{
		ID:       r.ID,
		ShopID:   r.ShopID,
		StoreID:  r.StoreID,
		Status:   r.Status,
		Currency: r.Currency,

		CustomerID:      ptrInt64(r.CustomerID),
		StartAt:         timeStr(r.StartAt),
		EndAt:           timeStr(r.EndAt),
		TotalPriceCents: int64(r.TotalPriceCents),
		IdempotencyKey:  ptrString(r.IdempotencyKey),
		Version:         r.Version,

		Notes:             ptrString(r.Notes),
		PickupPersonName:  ptrString(r.PickupPersonName),
		PickupPersonPhone: ptrString(r.PickupPersonPhone),
		PickupPersonEmail: ptrString(r.PickupPersonEmail),

		CancelledAt:  ptrTime(r.CancelledAt),
		CancelReason: ptrString(r.CancelReason),

		StoreSnapshotName: ptrString(r.StoreSnapshotName),

		CreatedAt: timeStr(r.CreatedAt),
		UpdatedAt: timeStr(r.UpdatedAt),
	}
}

func toReservationItemDTO(it db.ReservationItem) ReservationItemDTO {
	return ReservationItemDTO{
		ID:              it.ID,
		ReservationID:   it.ReservationID,
		InventoryItemID: it.InventoryItemID,

		ProductID: ptrInt64(it.ProductID),
		VariantID: ptrInt64(it.VariantID),

		IsActive:       it.IsActive,
		UnitPriceCents: int64(it.UnitPriceCents),
		Quantity:       it.Quantity,
		Currency:       it.Currency,
	}
}

func (s *Service) loadStoreView(ctx context.Context, storeID int64) (*StoreView, error) {
	store, err := s.q.GetStoreById(ctx, storeID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	// Treat null strings as "" for store fields (simplest for UI).
	addr := ""
	if store.Address1.Valid {
		addr = store.Address1.String
	}
	postal := ""
	if store.PostalCode.Valid {
		postal = store.PostalCode.String
	}
	city := ""
	if store.City.Valid {
		city = store.City.String
	}

	return &StoreView{
		ID:         store.ID,
		Name:       store.Name,
		Address1:   addr,
		PostalCode: postal,
		City:       city,
	}, nil
}

//
// -------------------- Enricher --------------------
//

func (s *Service) buildReservationItemViews(ctx context.Context, items []db.ReservationItem) ([]ReservationItemView, error) {
	out := make([]ReservationItemView, 0, len(items))

	for _, it := range items {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		view := ReservationItemView{
			ReservationItem: toReservationItemDTO(it),
			ProductID:       ptrInt64(it.ProductID),
			VariantID:       ptrInt64(it.VariantID),
		}

		if it.ProductID.Valid {
			productID := it.ProductID.Int64
			product, err := s.q.GetProduct(ctx, productID)
			if err != nil {
				if !errors.Is(err, sql.ErrNoRows) {
					return nil, fmt.Errorf("load product %d: %w", productID, err)
				}
			} else {
				view.ProductName = product.Name
			}
		}

		if it.VariantID.Valid {
			variantID := it.VariantID.Int64
			variant, err := s.q.GetProductVariantByID(ctx, variantID)
			if err != nil {
				if !errors.Is(err, sql.ErrNoRows) {
					return nil, fmt.Errorf("load variant %d: %w", variantID, err)
				}
			} else {
				view.VariantText = formatVariantAttributes(variant.Attributes)
			}

			if s.images != nil {
				url, err := s.images.GetPrimaryImageURL(ctx, variantID)
				if err != nil {
					if !errors.Is(err, sql.ErrNoRows) {
						return nil, fmt.Errorf("load image for variant %d: %w", variantID, err)
					}
				} else {
					view.ImageURL = url
				}
			}
		}

		out = append(out, view)
	}

	return out, nil
}

//
// -------------------- Checkout --------------------
//

type CheckoutInput struct {
	ShopID     int64
	StoreID    int64
	CustomerID int64

	IdempotencyKey string

	Notes             *string
	PickupPersonName  *string
	PickupPersonPhone *string
	PickupPersonEmail *string
}

func (s *Service) CheckoutFromCart(ctx context.Context, in CheckoutInput) ([]ReservationView, error) {
	if in.ShopID <= 0 || in.StoreID <= 0 || in.CustomerID <= 0 {
		return nil, fmt.Errorf("invalid checkout input: shop/store/customer required")
	}
	if in.IdempotencyKey == "" {
		return nil, ErrIdempotencyKeyMissing
	}
	if s.cart == nil {
		return nil, errors.New("reservation service missing cart service dependency")
	}

	cv, err := s.cart.GetCart(ctx, cart.Owner{CustomerID: &in.CustomerID}, in.ShopID)
	if err != nil {
		return nil, err
	}
	if cv == nil || len(cv.Items) == 0 {
		return nil, ErrCartEmpty
	}

	for _, it := range cv.Items {
		if it.Blocked {
			return nil, ErrCartBlocked
		}
	}

	type key struct{ start, end string }
	groups := map[key][]int64{}
	for _, it := range cv.Items {
		k := key{
			start: it.StartAt.UTC().Format(time.RFC3339Nano),
			end:   it.EndAt.UTC().Format(time.RFC3339Nano),
		}
		groups[k] = append(groups[k], it.ID)
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	qtx := s.q.WithTx(tx)

	// If you want store info in the checkout response too:
	storeView, err := s.loadStoreView(ctx, in.StoreID)
	if err != nil {
		return nil, err
	}

	out := make([]ReservationView, 0, len(groups))
	i := 0

	for k, cartItemIDs := range groups {
		i++

		startAt, _ := time.Parse(time.RFC3339Nano, k.start)
		endAt, _ := time.Parse(time.RFC3339Nano, k.end)
		if !startAt.Before(endAt) {
			return nil, ErrInvalidRange
		}

		idem := in.IdempotencyKey
		if len(groups) > 1 {
			idem = fmt.Sprintf("%s:%d", in.IdempotencyKey, i)
		}

		resRow, err := qtx.CheckoutCreateReservation(ctx, &db.CheckoutCreateReservationParams{
			ShopID:            in.ShopID,
			StoreID:           in.StoreID,
			CustomerID:        sql.NullInt64{Int64: in.CustomerID, Valid: true},
			StartAt:           startAt,
			EndAt:             endAt,
			IdempotencyKey:    idem,
			Notes:             toNullString(in.Notes),
			PickupPersonName:  toNullString(in.PickupPersonName),
			PickupPersonPhone: toNullString(in.PickupPersonPhone),
			PickupPersonEmail: toNullString(in.PickupPersonEmail),
			CartItemIds:       cartItemIDs,
		})
		if err != nil {
			return nil, err
		}

		res := mapCheckoutRowToReservation(resRow)

		_, err = qtx.CheckoutInsertReservationItemsFromCartItemIDs(ctx, &db.CheckoutInsertReservationItemsFromCartItemIDsParams{
			ReservationID: res.ID,
			CartItemIds:   cartItemIDs,
		})
		if err != nil {
			if isExclusionViolation(err) {
				return nil, ErrNotAvailableForDates
			}
			return nil, err
		}

		itemRows, err := qtx.ListReservationItemsByReservationIDs(ctx, []int64{res.ID})
		if err != nil {
			return nil, err
		}

		itemViews, err := s.buildReservationItemViews(ctx, itemRows)
		if err != nil {
			return nil, err
		}

		out = append(out, ReservationView{
			Reservation: toReservationDTO(res),
			Items:       itemViews,
			Store:       storeView,
		})
	}

	if err := qtx.UpdateCartStatus(ctx, &db.UpdateCartStatusParams{
		CartID: cv.Cart.ID,
		Status: "checked_out",
	}); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return out, nil
}

//
// -------------------- List / Get --------------------
//

type ListMyReservationsInput struct {
	ShopID     int64
	CustomerID int64
	Limit      int32
	Offset     int32
}

func (s *Service) ListMyReservations(ctx context.Context, in ListMyReservationsInput) ([]ReservationView, error) {
	if in.ShopID <= 0 || in.CustomerID <= 0 {
		return nil, fmt.Errorf("shop_id and customer_id required")
	}
	if in.Limit <= 0 || in.Limit > 200 {
		in.Limit = 50
	}
	if in.Offset < 0 {
		in.Offset = 0
	}

	resRows, err := s.q.ListMyReservations(ctx, &db.ListMyReservationsParams{
		ShopID:     in.ShopID,
		CustomerID: in.CustomerID,
		PageLimit:  in.Limit,
		PageOffset: in.Offset,
	})
	if err != nil {
		return nil, err
	}
	if len(resRows) == 0 {
		return []ReservationView{}, nil
	}

	ids := make([]int64, 0, len(resRows))
	for _, r := range resRows {
		ids = append(ids, r.ID)
	}

	itemRows, err := s.q.ListReservationItemsByReservationIDs(ctx, ids)
	if err != nil {
		return nil, err
	}

	itemViews, err := s.buildReservationItemViews(ctx, itemRows)
	if err != nil {
		return nil, err
	}

	byResID := map[int64][]ReservationItemView{}
	for _, v := range itemViews {
		rid := v.ReservationItem.ReservationID
		byResID[rid] = append(byResID[rid], v)
	}

	out := make([]ReservationView, 0, len(resRows))
	for _, r := range resRows {
		out = append(out, ReservationView{
			Reservation: toReservationDTO(r),
			Items:       byResID[r.ID],
			// Store omitted for list by default (keep it fast).
		})
	}
	return out, nil
}

func (s *Service) GetMyReservation(ctx context.Context, shopID, customerID, reservationID int64) (ReservationView, error) {
	if shopID <= 0 || customerID <= 0 || reservationID <= 0 {
		return ReservationView{}, ErrReservationNotFound
	}

	r, err := s.q.GetMyReservation(ctx, &db.GetMyReservationParams{
		ReservationID: reservationID,
		ShopID:        shopID,
		CustomerID:    customerID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ReservationView{}, ErrReservationNotFound
		}
		return ReservationView{}, err
	}

	itemRows, err := s.q.ListReservationItemsByReservationIDs(ctx, []int64{r.ID})
	if err != nil {
		return ReservationView{}, err
	}

	itemViews, err := s.buildReservationItemViews(ctx, itemRows)
	if err != nil {
		return ReservationView{}, err
	}

	storeView, err := s.loadStoreView(ctx, r.StoreID)
	if err != nil {
		return ReservationView{}, err
	}

	return ReservationView{
		Reservation: toReservationDTO(r),
		Items:       itemViews,
		Store:       storeView,
	}, nil
}

//
// -------------------- Cancel --------------------
//

type CancelInput struct {
	ShopID          int64
	CustomerID      int64
	ReservationID   int64
	ExpectedVersion int32
	CancelReason    *string
}

func (s *Service) CancelMyReservation(ctx context.Context, in CancelInput) (ReservationView, error) {
	if in.ShopID <= 0 || in.CustomerID <= 0 || in.ReservationID <= 0 {
		return ReservationView{}, ErrReservationNotFound
	}
	if in.ExpectedVersion <= 0 {
		return ReservationView{}, ErrOptimisticLock
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return ReservationView{}, err
	}
	defer tx.Rollback()

	qtx := s.q.WithTx(tx)

	r, err := qtx.CancelMyReservation(ctx, &db.CancelMyReservationParams{
		ReservationID:   in.ReservationID,
		ShopID:          in.ShopID,
		CustomerID:      in.CustomerID,
		ExpectedVersion: in.ExpectedVersion,
		CancelReason:    toNullString(in.CancelReason),
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ReservationView{}, ErrOptimisticLock
		}
		return ReservationView{}, err
	}

	if err := qtx.DeactivateReservationItems(ctx, r.ID); err != nil {
		return ReservationView{}, err
	}

	itemRows, err := qtx.ListReservationItemsByReservationIDs(ctx, []int64{r.ID})
	if err != nil {
		return ReservationView{}, err
	}

	itemViews, err := s.buildReservationItemViews(ctx, itemRows)
	if err != nil {
		return ReservationView{}, err
	}

	if err := tx.Commit(); err != nil {
		return ReservationView{}, err
	}

	// Include store in mutation response (so UI keeps it)
	storeView, err := s.loadStoreView(ctx, r.StoreID)
	if err != nil {
		return ReservationView{}, err
	}

	return ReservationView{
		Reservation: toReservationDTO(r),
		Items:       itemViews,
		Store:       storeView,
	}, nil
}

//
// -------------------- Reschedule --------------------
//

type RescheduleInput struct {
	ShopID          int64
	CustomerID      int64
	ReservationID   int64
	ExpectedVersion int32
	StartAt         time.Time
	EndAt           time.Time
}

func (s *Service) RescheduleMyReservation(ctx context.Context, in RescheduleInput) (ReservationView, error) {
	if in.ShopID <= 0 || in.CustomerID <= 0 || in.ReservationID <= 0 {
		return ReservationView{}, ErrReservationNotFound
	}
	if in.ExpectedVersion <= 0 {
		return ReservationView{}, ErrOptimisticLock
	}
	if !in.StartAt.Before(in.EndAt) {
		return ReservationView{}, ErrInvalidRange
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return ReservationView{}, err
	}
	defer tx.Rollback()

	qtx := s.q.WithTx(tx)

	r, err := qtx.RescheduleMyReservation(ctx, &db.RescheduleMyReservationParams{
		ReservationID:   in.ReservationID,
		ShopID:          in.ShopID,
		CustomerID:      in.CustomerID,
		ExpectedVersion: in.ExpectedVersion,
		StartAt:         in.StartAt,
		EndAt:           in.EndAt,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ReservationView{}, ErrOptimisticLock
		}
		return ReservationView{}, err
	}

	if err := qtx.RescheduleMyReservationItems(ctx, &db.RescheduleMyReservationItemsParams{
		ReservationID: in.ReservationID,
		StartAt:       in.StartAt,
		EndAt:         in.EndAt,
	}); err != nil {
		if isExclusionViolation(err) {
			return ReservationView{}, ErrNotAvailableForDates
		}
		return ReservationView{}, err
	}

	itemRows, err := s.q.ListReservationItemsByReservationIDs(ctx, []int64{r.ID})
	if err != nil {
		return ReservationView{}, err
	}

	itemViews, err := s.buildReservationItemViews(ctx, itemRows)
	if err != nil {
		return ReservationView{}, err
	}

	if err := tx.Commit(); err != nil {
		return ReservationView{}, err
	}

	storeView, err := s.loadStoreView(ctx, r.StoreID)
	if err != nil {
		return ReservationView{}, err
	}

	return ReservationView{
		Reservation: toReservationDTO(r),
		Items:       itemViews,
		Store:       storeView,
	}, nil
}

//
// -------------------- helpers --------------------
//

// Postgres exclusion violation is SQLSTATE 23P01
func isExclusionViolation(err error) bool {
	var pgxErr *pgconn.PgError
	if errors.As(err, &pgxErr) {
		return pgxErr.Code == "23P01"
	}

	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		return string(pqErr.Code) == "23P01"
	}

	return false
}

func mapCheckoutRowToReservation(r db.CheckoutCreateReservationRow) db.Reservation {
	status, ok := r.Status.(string)
	if !ok {
		status = fmt.Sprint(r.Status)
	}

	return db.Reservation{
		ID:                r.ID,
		ShopID:            r.ShopID,
		StoreID:           r.StoreID,
		CustomerID:        r.CustomerID,
		Status:            status,
		StartAt:           r.StartAt,
		EndAt:             r.EndAt,
		ReservationRange:  r.ReservationRange,
		TotalPriceCents:   r.TotalPriceCents,
		Currency:          r.Currency,
		IdempotencyKey:    r.IdempotencyKey,
		Version:           r.Version,
		Notes:             r.Notes,
		CreatedAt:         r.CreatedAt,
		UpdatedAt:         r.UpdatedAt,
		PickupPersonName:  r.PickupPersonName,
		PickupPersonPhone: r.PickupPersonPhone,
		PickupPersonEmail: r.PickupPersonEmail,
		CancelledAt:       r.CancelledAt,
		CancelReason:      r.CancelReason,
		StoreSnapshotName: r.StoreSnapshotName,
	}
}

func formatVariantAttributes(raw pqtype.NullRawMessage) string {
	if !raw.Valid {
		return ""
	}

	var attrs map[string]interface{}
	if err := json.Unmarshal(raw.RawMessage, &attrs); err != nil {
		return ""
	}

	parts := make([]string, 0, len(attrs))
	for _, v := range attrs {
		parts = append(parts, fmt.Sprintf("%v", v))
	}

	return strings.Join(parts, " · ")
}

type UpdateDetailsInput struct {
	ShopID          int64
	CustomerID      int64
	ReservationID   int64
	ExpectedVersion int32

	PickupPersonName  *string
	PickupPersonPhone *string
	PickupPersonEmail *string
	Notes             *string
}

func (s *Service) UpdateMyReservationDetails(ctx context.Context, in UpdateDetailsInput) (ReservationView, error) {
	if in.ShopID <= 0 || in.CustomerID <= 0 || in.ReservationID <= 0 {
		return ReservationView{}, ErrReservationNotFound
	}
	if in.ExpectedVersion <= 0 {
		return ReservationView{}, ErrOptimisticLock
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return ReservationView{}, err
	}
	defer tx.Rollback()

	qtx := s.q.WithTx(tx)

	updated, err := qtx.UpdateMyReservationDetails(ctx, &db.UpdateMyReservationDetailsParams{
		ReservationID:     in.ReservationID,
		ShopID:            in.ShopID,
		CustomerID:        in.CustomerID,
		ExpectedVersion:   in.ExpectedVersion,
		PickupPersonName:  toNullString(in.PickupPersonName),
		PickupPersonPhone: toNullString(in.PickupPersonPhone),
		PickupPersonEmail: toNullString(in.PickupPersonEmail),
		Notes:             toNullString(in.Notes),
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ReservationView{}, ErrOptimisticLock
		}
		return ReservationView{}, err
	}

	itemRows, err := qtx.ListReservationItemsByReservationIDs(ctx, []int64{updated.ID})
	if err != nil {
		return ReservationView{}, err
	}

	itemViews, err := s.buildReservationItemViews(ctx, itemRows)
	if err != nil {
		return ReservationView{}, err
	}

	if err := tx.Commit(); err != nil {
		return ReservationView{}, err
	}

	storeView, err := s.loadStoreView(ctx, updated.StoreID)
	if err != nil {
		return ReservationView{}, err
	}

	return ReservationView{
		Reservation: toReservationDTO(updated),
		Items:       itemViews,
		Store:       storeView,
	}, nil
}

type CancelItemInput struct {
	ShopID            int64
	CustomerID        int64
	ReservationID     int64
	ReservationItemID int64
	ExpectedVersion   int32
}

func (s *Service) CancelMyReservationItem(ctx context.Context, in CancelItemInput) (ReservationView, error) {
	if in.ShopID <= 0 || in.CustomerID <= 0 || in.ReservationID <= 0 || in.ReservationItemID <= 0 {
		return ReservationView{}, ErrReservationNotFound
	}
	if in.ExpectedVersion <= 0 {
		return ReservationView{}, ErrOptimisticLock
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return ReservationView{}, err
	}
	defer tx.Rollback()

	qtx := s.q.WithTx(tx)

	updated, err := qtx.CancelMyReservationItem(ctx, &db.CancelMyReservationItemParams{
		ReservationItemID: in.ReservationItemID,
		ReservationID:     in.ReservationID,
		ShopID:            in.ShopID,
		CustomerID:        in.CustomerID,
		ExpectedVersion:   in.ExpectedVersion,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ReservationView{}, ErrOptimisticLock
		}
		return ReservationView{}, err
	}

	itemRows, err := qtx.ListReservationItemsByReservationIDs(ctx, []int64{updated.ID})
	if err != nil {
		return ReservationView{}, err
	}

	itemViews, err := s.buildReservationItemViews(ctx, itemRows)
	if err != nil {
		return ReservationView{}, err
	}

	if err := tx.Commit(); err != nil {
		return ReservationView{}, err
	}

	storeView, err := s.loadStoreView(ctx, updated.StoreID)
	if err != nil {
		return ReservationView{}, err
	}

	return ReservationView{
		Reservation: toReservationDTOFromCancelItemRow(updated),
		Items:       itemViews,
		Store:       storeView,
	}, nil
}

func toReservationDTOFromCancelItemRow(r db.CancelMyReservationItemRow) ReservationDTO {
	status, ok := r.Status.(string)
	if !ok {
		status = fmt.Sprint(r.Status)
	}
	return ReservationDTO{
		ID:       r.ID,
		ShopID:   r.ShopID,
		StoreID:  r.StoreID,
		Status:   status,
		Currency: r.Currency,

		CustomerID:      ptrInt64(r.CustomerID),
		StartAt:         timeStr(r.StartAt),
		EndAt:           timeStr(r.EndAt),
		TotalPriceCents: int64(r.TotalPriceCents),
		IdempotencyKey:  ptrString(r.IdempotencyKey),
		Version:         r.Version,

		Notes:             ptrString(r.Notes),
		PickupPersonName:  ptrString(r.PickupPersonName),
		PickupPersonPhone: ptrString(r.PickupPersonPhone),
		PickupPersonEmail: ptrString(r.PickupPersonEmail),

		CancelledAt:  ptrTime(r.CancelledAt),
		CancelReason: ptrString(r.CancelReason),

		StoreSnapshotName: ptrString(r.StoreSnapshotName),

		CreatedAt: timeStr(r.CreatedAt),
		UpdatedAt: timeStr(r.UpdatedAt),
	}
}
