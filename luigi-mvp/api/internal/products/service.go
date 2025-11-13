package products

import (
	"context"
	"database/sql"
	"strings"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

type productQuerier interface {
	CreateProduct(ctx context.Context, arg *db.CreateProductParams) (db.Product, error)
	ListProducts(ctx context.Context, arg *db.ListProductsParams) ([]db.Product, error)
	UpdateProduct(ctx context.Context, arg *db.UpdateProductParams) (db.Product, error)
	DeleteProduct(ctx context.Context, id int64) (db.Product, error)
}

type Service struct {
	q productQuerier
}

func NewService(q db.Querier) *Service { return &Service{q: q} }

var ErrNotFound = sql.ErrNoRows

type ListInput struct {
	ShopID *int64
	Limit  int32
	Offset int32
}

func (s *Service) List(ctx context.Context, in ListInput) ([]db.Product, error) {
	if in.Limit <= 0 || in.Limit > 200 {
		in.Limit = 50
	}
	if in.Offset < 0 {
		in.Offset = 0
	}

	return s.q.ListProducts(ctx, &db.ListProductsParams{
		ShopID:     u.ToNullInt64(in.ShopID),
		PageOffset: in.Offset,
		PageLimit:  in.Limit,
	})
}

type CreateInput struct {
	ShopID        int64
	SKU           *string
	Name          string
	Description   *string
	PriceCategory string
	IsActive      *bool
}

func (s *Service) Create(ctx context.Context, in CreateInput) (db.Product, error) {
	name := strings.TrimSpace(in.Name)
	priceCat := strings.TrimSpace(in.PriceCategory)

	return s.q.CreateProduct(ctx, &db.CreateProductParams{
		ShopID:        in.ShopID,
		Sku:           u.ToNullString(in.SKU),
		Name:          name,
		Description:   u.ToNullString(in.Description),
		PriceCategory: priceCat,
		IsActive:      u.ToNullBool(in.IsActive),
	})
}

type UpdateInput struct {
	ID            int64
	SKU           *string
	Name          *string
	Description   *string
	PriceCategory *string
	IsActive      *bool
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (db.Product, error) {
	// Name + price_category are NOT NULL in schema, but we keep current value
	// if caller passes nil / empty.
	return s.q.UpdateProduct(ctx, &db.UpdateProductParams{
		Sku:           u.ToNullString(in.SKU),
		Name:          u.ToNullString(in.Name),
		Description:   u.ToNullString(in.Description),
		PriceCategory: u.ToNullString(in.PriceCategory),
		IsActive:      u.ToNullBool(in.IsActive),
		ID:            in.ID,
	})
}

func (s *Service) Delete(ctx context.Context, id int64) (db.Product, error) {
	return s.q.DeleteProduct(ctx, id)
}
