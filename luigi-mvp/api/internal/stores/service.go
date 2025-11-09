package stores

import (
	"context"
	"database/sql"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
)

type storeQuerier interface {
	ListStores(ctx context.Context, arg *db.ListStoresParams) ([]db.Store, error)
	CreateStore(ctx context.Context, arg *db.CreateStoreParams) (db.Store, error)
	UpdateStore(ctx context.Context, arg *db.UpdateStoreParams) (db.Store, error)
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
	return s.q.ListStores(ctx, &db.ListStoresParams{
		ShopID:     in.ShopID,
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
		ShopID: in.ShopID,
		Name:   in.Name,
		Address1: sql.NullString{
			String: *in.Address1,
			Valid:  in.Address1 != nil,
		},
		Address2: sql.NullString{
			String: *in.Address2,
			Valid:  in.Address2 != nil,
		},
		PostalCode: sql.NullString{
			String: *in.PostalCode,
			Valid:  in.PostalCode != nil,
		},
		City: sql.NullString{
			String: *in.City,
			Valid:  in.City != nil,
		},
		Country: in.Country, // nil -> default 'CH' via COALESCE
		Timezone: sql.NullString{
			String: *in.Timezone,
			Valid:  in.Timezone != nil,
		},
		IsActive: in.IsActive, // nil -> default TRUE via COALESCE
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
		ID: in.ID,
		Name: sql.NullString{
			String: *in.Name,
			Valid:  in.Name != nil,
		},
		Address1: sql.NullString{
			String: *in.Address1,
			Valid:  in.Address1 != nil,
		},
		Address2: sql.NullString{
			String: *in.Address2,
			Valid:  in.Address2 != nil,
		},
		PostalCode: sql.NullString{
			String: *in.PostalCode,
			Valid:  in.PostalCode != nil,
		},
		City: sql.NullString{
			String: *in.City,
			Valid:  in.City != nil,
		},
		Country: sql.NullString{
			String: *in.Country,
			Valid:  in.Country != nil,
		},
		Timezone: sql.NullString{
			String: *in.Timezone,
			Valid:  in.Timezone != nil,
		},
		IsActive: sql.NullBool{
			Bool:  *in.IsActive,
			Valid: in.IsActive != nil,
		},
	})
}

var ErrNotFound = sql.ErrNoRows
