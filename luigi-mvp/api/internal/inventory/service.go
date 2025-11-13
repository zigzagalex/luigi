package inventory

import (
	"context"
	"database/sql"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

type itemQuerier interface {
	ListInventoryItems(ctx context.Context, arg *db.ListInventoryItemsParams) ([]db.InventoryItem, error)
	CreateInventoryItem(ctx context.Context, arg *db.CreateInventoryItemParams) (db.InventoryItem, error)
	UpdateInventoryItem(ctx context.Context, arg *db.UpdateInventoryItemParams) (db.InventoryItem, error)
	DeleteInventoryItem(ctx context.Context, id int64) (db.InventoryItem, error)
}

type Service struct {
	q itemQuerier
}

func NewService(q db.Querier) *Service { return &Service{q: q} }

var ErrNotFound = sql.ErrNoRows

type ListInput struct {
	ShopID *int64
	Limit  int32
	Offset int32
}

func (s *Service) List(ctx context.Context, in ListInput) ([]db.InventoryItem, error) {
	if in.Limit <= 0 || in.Limit > 200 {
		in.Limit = 50
	}
	if in.Offset < 0 {
		in.Offset = 0
	}
	return s.q.ListInventoryItems(ctx, &db.ListInventoryItemsParams{
		ShopID:     u.ToNullInt64(in.ShopID),
		PageOffset: in.Offset,
		PageLimit:  in.Limit,
	})
}

type CreateInput struct {
	ShopID           int64
	ProductVariantID int64
	StoreID          int64
	TagCode          *string
	SerialNumber     *string
	Status           *string // "active" | "inactive" | "retired", nil → "active"
	ServiceBefore    *string // e.g. "15 minutes", "00:15:00"
	ServiceAfter     *string
	IsActive         *bool // nil → true
}

func (s *Service) Create(ctx context.Context, in CreateInput) (db.InventoryItem, error) {
	return s.q.CreateInventoryItem(ctx, &db.CreateInventoryItemParams{
		ShopID:               in.ShopID,
		ProductVariantID:     in.ProductVariantID,
		StoreID:              in.StoreID,
		TagCode:              u.ToNullString(in.TagCode),
		SerialNumber:         u.ToNullString(in.SerialNumber),
		Status:               u.ToNullString(in.Status),
		ServicePaddingBefore: u.ToNullString(in.ServiceBefore),
		ServicePaddingAfter:  u.ToNullString(in.ServiceAfter),
		IsActive:             u.ToNullBool(in.IsActive),
	})
}

type UpdateInput struct {
	ID            int64
	TagCode       *string
	SerialNumber  *string
	Status        *string
	ServiceBefore *string
	ServiceAfter  *string
	IsActive      *bool
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (db.InventoryItem, error) {
	return s.q.UpdateInventoryItem(ctx, &db.UpdateInventoryItemParams{
		ID:                   in.ID,
		TagCode:              u.ToNullString(in.TagCode),
		SerialNumber:         u.ToNullString(in.SerialNumber),
		Status:               u.ToNullString(in.Status),
		ServicePaddingBefore: u.ToNullString(in.ServiceBefore),
		ServicePaddingAfter:  u.ToNullString(in.ServiceAfter),
		IsActive:             u.ToNullBool(in.IsActive),
	})
}

func (s *Service) Delete(ctx context.Context, id int64) (db.InventoryItem, error) {
	return s.q.DeleteInventoryItem(ctx, id)
}
