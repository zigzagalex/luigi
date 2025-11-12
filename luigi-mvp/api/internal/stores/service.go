package stores

import (
	"context"
	"database/sql"
	"strings"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
)

type storeQuerier interface {
	ListStores(ctx context.Context, arg *db.ListStoresParams) ([]db.Store, error)
	CreateStore(ctx context.Context, arg *db.CreateStoreParams) (db.Store, error)
	UpdateStore(ctx context.Context, arg *db.UpdateStoreParams) (db.Store, error)
	DeleteStore(ctx context.Context, id int64) (db.Store, error)
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
		Address1:   toNullString(in.Address1),
		Address2:   toNullString(in.Address2),
		PostalCode: toNullString(in.PostalCode),
		City:       toNullString(in.City),
		// nil -> NULL -> COALESCE(..., 'CH')
		Country: toNullString(in.Country),
		// nil -> NULL -> stored NULL (no default)
		Timezone: toNullString(in.Timezone),
		// nil -> NULL -> COALESCE(..., TRUE)
		IsActive: toNullBool(in.IsActive),
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
		Name:       toNullString(in.Name),
		Address1:   toNullString(in.Address1),
		Address2:   toNullString(in.Address2),
		PostalCode: toNullString(in.PostalCode),
		City:       toNullString(in.City),
		Country:    toNullString(in.Country),
		Timezone:   toNullString(in.Timezone),
		IsActive:   toNullBool(in.IsActive),
	})
}

func (s *Service) Delete(ctx context.Context, id int64) (db.Store, error) {
	return s.q.DeleteStore(ctx, id)
}

var ErrNotFound = sql.ErrNoRows

func toNullString(p *string) sql.NullString {
	if p == nil {
		return sql.NullString{Valid: false}
	}
	s := strings.TrimSpace(*p)
	if s == "" {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: s, Valid: true}
}

func toNullBool(p *bool) sql.NullBool {
	if p == nil {
		return sql.NullBool{Valid: false}
	}
	return sql.NullBool{Bool: *p, Valid: true}
}
