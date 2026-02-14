package reservation

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/lib/pq"
	"github.com/zigzagalex/luigi/api/internal/cart"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
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
	q    *db.Queries
	db   *sql.DB
	cart *cart.Service
}

func NewService(q *db.Queries, sqlDB *sql.DB, cartSvc *cart.Service) *Service {
	return &Service{q: q, db: sqlDB, cart: cartSvc}
}

// Views

type ReservationItemView struct {
	db.ReservationItem `json:"reservation_item"`
}

type ReservationView struct {
	Reservation db.Reservation       `json:"reservation"`
	Items       []db.ReservationItem `json:"items"`
}

type ReservationsListView struct {
	Reservations []db.Reservation     `json:"reservations"`
	Items        []db.ReservationItem `json:"items"` // flat; frontend can group
}

// Checkout

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

// If cart contains multiple distinct date ranges, create one reservation per range.
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

	// 1) Load cart as the single source of truth for “blocked” enforcement
	cv, err := s.cart.GetCart(ctx, cart.Owner{CustomerID: &in.CustomerID}, in.ShopID)
	if err != nil {
		return nil, err
	}
	if cv == nil || len(cv.Items) == 0 {
		return nil, ErrCartEmpty
	}

	// enforce same rule as UI
	for _, it := range cv.Items {
		if it.Blocked {
			return nil, ErrCartBlocked
		}
	}

	// 2) Group cart items by (start_at, end_at).
	// Support multiple date ranges in the cart cleanly.
	type key struct {
		start string
		end   string
	}
	groups := map[key][]int64{}
	for _, it := range cv.Items {
		k := key{
			start: it.StartAt.UTC().Format(time.RFC3339Nano),
			end:   it.EndAt.UTC().Format(time.RFC3339Nano),
		}
		groups[k] = append(groups[k], it.ID)
	}

	// 3) One transaction for all reservations created from this cart
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	qtx := s.q.WithTx(tx)

	out := make([]ReservationView, 0, len(groups))
	i := 0
	for k, cartItemIDs := range groups {
		i++

		startAt, _ := time.Parse(time.RFC3339Nano, k.start)
		endAt, _ := time.Parse(time.RFC3339Nano, k.end)
		if !startAt.Before(endAt) {
			return nil, ErrInvalidRange
		}

		// If multiple reservations: derive stable idempotency keys per group
		idem := in.IdempotencyKey
		if len(groups) > 1 {
			idem = fmt.Sprintf("%s:%d", in.IdempotencyKey, i)
		}

		// 3a) Create reservation (idempotent by idempotency_key)
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

		// 3b) Insert reservation items from cart items (may fail due to exclusion constraint)
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

		// 3c) Load inserted items for response
		items, err := qtx.ListReservationItemsByReservationIDs(ctx, []int64{res.ID})
		if err != nil {
			return nil, err
		}

		out = append(out, ReservationView{
			Reservation: res,
			Items:       items,
		})
	}

	// 4) Close the cart (so user can’t “checkout again” with same items)
	// This assumes you already have UpdateCartStatus in SQLC like your cart service uses.
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

// ------------ List / Get ------------

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

	byResID := map[int64][]db.ReservationItem{}
	for _, it := range itemRows {
		byResID[it.ReservationID] = append(byResID[it.ReservationID], it)
	}

	out := make([]ReservationView, 0, len(resRows))
	for _, r := range resRows {
		out = append(out, ReservationView{
			Reservation: r,
			Items:       byResID[r.ID],
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

	items, err := s.q.ListReservationItemsByReservationIDs(ctx, []int64{r.ID})
	if err != nil {
		return ReservationView{}, err
	}

	return ReservationView{Reservation: r, Items: items}, nil
}

// ------------ Cancel ------------

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
			// Either not found OR version mismatch OR not confirmed
			return ReservationView{}, ErrOptimisticLock
		}
		return ReservationView{}, err
	}

	// Make items inactive so exclusion constraint stops blocking future rentals
	if err := qtx.DeactivateReservationItems(ctx, r.ID); err != nil {
		return ReservationView{}, err
	}

	items, err := qtx.ListReservationItemsByReservationIDs(ctx, []int64{r.ID})
	if err != nil {
		return ReservationView{}, err
	}

	if err := tx.Commit(); err != nil {
		return ReservationView{}, err
	}

	return ReservationView{Reservation: r, Items: items}, nil
}

// ------------ Reschedule ------------

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

	// This can fail due to exclusion constraint => translate to a clean domain error
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

	items, err := qtx.ListReservationItemsByReservationIDs(ctx, []int64{r.ID})
	if err != nil {
		return ReservationView{}, err
	}

	if err := tx.Commit(); err != nil {
		return ReservationView{}, err
	}

	return ReservationView{Reservation: r, Items: items}, nil
}

// ------------ helpers ------------

func toNullString(p *string) sql.NullString {
	if p == nil {
		return sql.NullString{}
	}
	if *p == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: *p, Valid: true}
}

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
	return db.Reservation{
		ID:                r.ID,
		ShopID:            r.ShopID,
		StoreID:           r.StoreID,
		CustomerID:        r.CustomerID,
		Status:            r.Status,
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
