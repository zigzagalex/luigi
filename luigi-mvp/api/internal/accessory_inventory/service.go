package accessoryinventory

import (
	"context"
	"database/sql"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

type itemQuerier interface {
	ListAccessoryInventoryItems(ctx context.Context, arg *db.ListAccessoryInventoryItemsParams) ([]db.AccessoryInventoryItem, error)
	CreateAccessoryInventoryItem(ctx context.Context, arg *db.CreateAccessoryInventoryItemParams) (db.AccessoryInventoryItem, error)
	UpdateAccessoryInventoryItem(ctx context.Context, arg *db.UpdateAccessoryInventoryItemParams) (db.AccessoryInventoryItem, error)
	DeleteAccessoryInventoryItem(ctx context.Context, id int64) (db.AccessoryInventoryItem, error)
}

type Service struct {
	q itemQuerier
}

func NewService(q db.Querier) *Service { return &Service{q: q} }

var ErrNotFound = sql.ErrNoRows

type ListInput struct {
	ShopID             *int64
	AccessoryVariantID *int64
	Limit              int32
	Offset             int32
}

func (s *Service) List(ctx context.Context, in ListInput) ([]db.AccessoryInventoryItem, error) {
	if in.Limit <= 0 || in.Limit > 200 {
		in.Limit = 50
	}
	if in.Offset < 0 {
		in.Offset = 0
	}
	return s.q.ListAccessoryInventoryItems(ctx, &db.ListAccessoryInventoryItemsParams{
		ShopID:             u.ToNullInt64(in.ShopID),
		AccessoryVariantID: u.ToNullInt64(in.AccessoryVariantID),
		PageOffset:         in.Offset,
		PageLimit:          in.Limit,
	})
}

type CreateInput struct {
	ShopID             int64
	AccessoryVariantID int64
	StoreID            int64
	TagCode            *string
	SerialNumber       *string
	Status             *string
	ServiceBefore      *string
	ServiceAfter       *string
	IsActive           *bool
}

func (s *Service) Create(ctx context.Context, in CreateInput) (db.AccessoryInventoryItem, error) {
	return s.q.CreateAccessoryInventoryItem(ctx, &db.CreateAccessoryInventoryItemParams{
		ShopID:               in.ShopID,
		AccessoryVariantID:   in.AccessoryVariantID,
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

func (s *Service) Update(ctx context.Context, in UpdateInput) (db.AccessoryInventoryItem, error) {
	return s.q.UpdateAccessoryInventoryItem(ctx, &db.UpdateAccessoryInventoryItemParams{
		ID:                   in.ID,
		TagCode:              u.ToNullString(in.TagCode),
		SerialNumber:         u.ToNullString(in.SerialNumber),
		Status:               u.ToNullString(in.Status),
		ServicePaddingBefore: u.ToNullString(in.ServiceBefore),
		ServicePaddingAfter:  u.ToNullString(in.ServiceAfter),
		IsActive:             u.ToNullBool(in.IsActive),
	})
}

func (s *Service) Delete(ctx context.Context, id int64) (db.AccessoryInventoryItem, error) {
	return s.q.DeleteAccessoryInventoryItem(ctx, id)
}
