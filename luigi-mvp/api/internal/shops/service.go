package shops

import (
	"context"
	"database/sql"
	"strings"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
)

type shopQuerier interface {
	ListShops(ctx context.Context, arg *db.ListShopsParams) ([]db.Shop, error)
	CreateShop(ctx context.Context, arg *db.CreateShopParams) (db.Shop, error)
	UpdateShop(ctx context.Context, arg *db.UpdateShopParams) (db.Shop, error)
}

type Service struct {
	q shopQuerier
}

func NewService(q db.Querier) *Service {
	return &Service{q: q}
}

type ListInput struct {
	Limit  int32
	Offset int32
}

func (s *Service) List(ctx context.Context, in ListInput) ([]db.Shop, error) {
	if in.Limit <= 0 || in.Limit > 200 {
		in.Limit = 50
	}
	if in.Offset < 0 {
		in.Offset = 0
	}

	return s.q.ListShops(ctx, &db.ListShopsParams{
		PageLimit:  in.Limit,
		PageOffset: in.Offset,
	})
}

type CreateInput struct {
	Name     string
	Timezone *string
	IsActive *bool
}

func (s *Service) Create(ctx context.Context, in CreateInput) (db.Shop, error) {
	return s.q.CreateShop(ctx, &db.CreateShopParams{
		Name:     in.Name,
		Timezone: toNullString(in.Timezone),
		IsActive: toNullBool(in.IsActive),
	})
}

type UpdateInput struct {
	ID       int64
	Name     *string
	Timezone *string
	IsActive *bool
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (db.Shop, error) {
	return s.q.UpdateShop(ctx, &db.UpdateShopParams{
		ID:       in.ID,
		Name:     toNullString(in.Name),
		Timezone: toNullString(in.Timezone),
		IsActive: toNullBool(in.IsActive),
	})
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
