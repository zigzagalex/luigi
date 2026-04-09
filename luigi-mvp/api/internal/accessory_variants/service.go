package accessoryvariants

import (
	"context"
	"database/sql"
	"encoding/json"
	"strings"

	"github.com/sqlc-dev/pqtype"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

type variantQuerier interface {
	CreateAccessoryVariant(ctx context.Context, arg *db.CreateAccessoryVariantParams) (db.AccessoryVariant, error)
	ListAccessoryVariants(ctx context.Context, arg *db.ListAccessoryVariantsParams) ([]db.AccessoryVariant, error)
	UpdateAccessoryVariant(ctx context.Context, arg *db.UpdateAccessoryVariantParams) (db.AccessoryVariant, error)
	DeleteAccessoryVariant(ctx context.Context, id int64) (db.AccessoryVariant, error)
	GetAccessoryVariantByID(ctx context.Context, id int64) (db.AccessoryVariant, error)
}

type Service struct {
	q variantQuerier
}

func NewService(q db.Querier) *Service { return &Service{q: q} }

var ErrNotFound = sql.ErrNoRows

type ListInput struct {
	AccessoryID *int64
	Limit       int32
	Offset      int32
}

func (s *Service) List(ctx context.Context, in ListInput) ([]db.AccessoryVariant, error) {
	if in.Limit <= 0 || in.Limit > 200 {
		in.Limit = 50
	}
	if in.Offset < 0 {
		in.Offset = 0
	}

	return s.q.ListAccessoryVariants(ctx, &db.ListAccessoryVariantsParams{
		AccessoryID: u.ToNullInt64(in.AccessoryID),
		PageOffset:  in.Offset,
		PageLimit:   in.Limit,
	})
}

type CreateInput struct {
	AccessoryID int64
	Label       string
	Attributes  json.RawMessage
	IsActive    *bool
}

func (s *Service) Create(ctx context.Context, in CreateInput) (db.AccessoryVariant, error) {
	label := strings.TrimSpace(in.Label)

	var attrs pqtype.NullRawMessage
	if len(in.Attributes) > 0 {
		attrs = pqtype.NullRawMessage{
			RawMessage: in.Attributes,
			Valid:      true,
		}
	} else {
		attrs = pqtype.NullRawMessage{Valid: false}
	}

	return s.q.CreateAccessoryVariant(ctx, &db.CreateAccessoryVariantParams{
		AccessoryID: in.AccessoryID,
		Label:       label,
		Attributes:  attrs,
		IsActive:    u.ToNullBool(in.IsActive),
	})
}

type UpdateInput struct {
	ID         int64
	Label      *string
	Attributes *json.RawMessage
	IsActive   *bool
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (db.AccessoryVariant, error) {
	var attrs pqtype.NullRawMessage
	if in.Attributes != nil {
		if len(*in.Attributes) > 0 {
			attrs = pqtype.NullRawMessage{
				RawMessage: *in.Attributes,
				Valid:      true,
			}
		} else {
			attrs = pqtype.NullRawMessage{Valid: false}
		}
	} else {
		attrs = pqtype.NullRawMessage{Valid: false}
	}

	return s.q.UpdateAccessoryVariant(ctx, &db.UpdateAccessoryVariantParams{
		Label:      u.ToNullString(in.Label),
		Attributes: attrs,
		IsActive:   u.ToNullBool(in.IsActive),
		ID:         in.ID,
	})
}

func (s *Service) Delete(ctx context.Context, id int64) (db.AccessoryVariant, error) {
	return s.q.DeleteAccessoryVariant(ctx, id)
}

func (s *Service) GetByID(ctx context.Context, id int64) (db.AccessoryVariant, error) {
	return s.q.GetAccessoryVariantByID(ctx, id)
}
