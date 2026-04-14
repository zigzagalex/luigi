package stores

import (
	"context"
	"database/sql"
	"errors"
	"time"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

type storeQuerier interface {
	ListStores(ctx context.Context, arg *db.ListStoresParams) ([]db.Store, error)
	CreateStore(ctx context.Context, arg *db.CreateStoreParams) (db.Store, error)
	UpdateStore(ctx context.Context, arg *db.UpdateStoreParams) (db.Store, error)
	DeleteStore(ctx context.Context, id int64) (db.Store, error)
	GetStoreById(ctx context.Context, id int64) (db.Store, error)
	ListStoreOpeningTimes(ctx context.Context, storeID int64) ([]db.StoreOpeningTime, error)
	ListStoreHolidays(ctx context.Context, storeID int64) ([]db.StoreHoliday, error)
	DeleteStoreHolidays(ctx context.Context, storeID int64) error
	CreateStoreHoliday(ctx context.Context, arg *db.CreateStoreHolidayParams) error
	DeleteStoreOpeningTimes(ctx context.Context, storeID int64) error
	UpsertStoreOpeningTime(ctx context.Context, arg *db.UpsertStoreOpeningTimeParams) error
}

type Service struct {
	q storeQuerier
}

func NewService(q db.Querier) *Service {
	return &Service{q: q}
}

type ListInput struct {
	ShopID *int64
	Limit  int32
	Offset int32
}

func (s *Service) List(ctx context.Context, in ListInput) ([]db.Store, error) {
	if in.Limit <= 0 || in.Limit > 200 {
		in.Limit = 50
	}
	if in.Offset < 0 {
		in.Offset = 0
	}
	var shopID sql.NullInt64
	if in.ShopID != nil {
		shopID = sql.NullInt64{Int64: *in.ShopID, Valid: true}
	}
	return s.q.ListStores(ctx, &db.ListStoresParams{
		ShopID:     shopID,
		PageLimit:  in.Limit,
		PageOffset: in.Offset,
	})
}

type CreateInput struct {
	ShopID     int64
	Name       string
	Address1   *string
	Address2   *string
	PostalCode *string
	City       *string
	Country    *string
	Timezone   *string
	IsActive   *bool
}

func (s *Service) Create(ctx context.Context, in CreateInput) (db.Store, error) {
	return s.q.CreateStore(ctx, &db.CreateStoreParams{
		ShopID:     in.ShopID,
		Name:       in.Name,
		Address1:   u.ToNullString(in.Address1),
		Address2:   u.ToNullString(in.Address2),
		PostalCode: u.ToNullString(in.PostalCode),
		City:       u.ToNullString(in.City),
		// nil -> NULL -> COALESCE(..., 'CH')
		Country: u.ToNullString(in.Country),
		// nil -> NULL -> stored NULL (no default)
		Timezone: u.ToNullString(in.Timezone),
		// nil -> NULL -> COALESCE(..., TRUE)
		IsActive: u.ToNullBool(in.IsActive),
	})
}

type UpdateInput struct {
	ID         int64
	Name       *string
	Address1   *string
	Address2   *string
	PostalCode *string
	City       *string
	Country    *string
	Timezone   *string
	IsActive   *bool
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (db.Store, error) {
	return s.q.UpdateStore(ctx, &db.UpdateStoreParams{
		ID:         in.ID,
		Name:       u.ToNullString(in.Name),
		Address1:   u.ToNullString(in.Address1),
		Address2:   u.ToNullString(in.Address2),
		PostalCode: u.ToNullString(in.PostalCode),
		City:       u.ToNullString(in.City),
		Country:    u.ToNullString(in.Country),
		Timezone:   u.ToNullString(in.Timezone),
		IsActive:   u.ToNullBool(in.IsActive),
	})
}

func (s *Service) Delete(ctx context.Context, id int64) (db.Store, error) {
	return s.q.DeleteStore(ctx, id)
}

func (s *Service) GetStoreById(ctx context.Context, id int64) (db.Store, error) {
	if id <= 0 {
		return db.Store{}, errors.New("invalid store id")
	}
	store, err := s.q.GetStoreById(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return db.Store{}, ErrNotFound
		}
		return db.Store{}, err
	}
	return store, nil
}

var ErrNotFound = sql.ErrNoRows

type OpeningTimeInput struct {
	DayOfWeek int16
	OpensAt   *time.Time
	ClosesAt  *time.Time
	IsClosed  bool
}

type HolidayInput struct {
	StartDate time.Time
	EndDate   time.Time
	Note      *string
}

func (s *Service) ListOpeningTimes(ctx context.Context, storeID int64) ([]db.StoreOpeningTime, error) {
	return s.q.ListStoreOpeningTimes(ctx, storeID)
}

func (s *Service) ListHolidays(ctx context.Context, storeID int64) ([]db.StoreHoliday, error) {
	return s.q.ListStoreHolidays(ctx, storeID)
}

func (s *Service) ReplaceOpeningTimes(ctx context.Context, storeID int64, times []OpeningTimeInput) error {
	if err := s.q.DeleteStoreOpeningTimes(ctx, storeID); err != nil {
		return err
	}
	for _, item := range times {
		var opensAt sql.NullTime
		var closesAt sql.NullTime
		if item.OpensAt != nil {
			opensAt = sql.NullTime{Time: *item.OpensAt, Valid: true}
		}
		if item.ClosesAt != nil {
			closesAt = sql.NullTime{Time: *item.ClosesAt, Valid: true}
		}

		if err := s.q.UpsertStoreOpeningTime(ctx, &db.UpsertStoreOpeningTimeParams{
			StoreID:   storeID,
			DayOfWeek: item.DayOfWeek,
			OpensAt:   opensAt,
			ClosesAt:  closesAt,
			IsClosed:  sql.NullBool{Bool: item.IsClosed, Valid: true},
		}); err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) ReplaceHolidays(ctx context.Context, storeID int64, holidays []HolidayInput) error {
	if err := s.q.DeleteStoreHolidays(ctx, storeID); err != nil {
		return err
	}
	for _, item := range holidays {
		if err := s.q.CreateStoreHoliday(ctx, &db.CreateStoreHolidayParams{
			StoreID:   storeID,
			StartDate: item.StartDate,
			EndDate:   item.EndDate,
			Note:      u.ToNullString(item.Note),
		}); err != nil {
			return err
		}
	}
	return nil
}
