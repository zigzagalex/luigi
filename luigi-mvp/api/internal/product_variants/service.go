package productvariants

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
	CreateProductVariant(ctx context.Context, arg *db.CreateProductVariantParams) (db.ProductVariant, error)
	ListProductVariants(ctx context.Context, arg *db.ListProductVariantsParams) ([]db.ProductVariant, error)
	UpdateProductVariant(ctx context.Context, arg *db.UpdateProductVariantParams) (db.ProductVariant, error)
	DeleteProductVariant(ctx context.Context, id int64) (db.ProductVariant, error)
}

type Service struct {
	q variantQuerier
}

func NewService(q db.Querier) *Service { return &Service{q: q} }

var ErrNotFound = sql.ErrNoRows

type ListInput struct {
	ProductID *int64
	Limit     int32
	Offset    int32
}

func (s *Service) List(ctx context.Context, in ListInput) ([]db.ProductVariant, error) {
	if in.Limit <= 0 || in.Limit > 200 {
		in.Limit = 50
	}
	if in.Offset < 0 {
		in.Offset = 0
	}

	return s.q.ListProductVariants(ctx, &db.ListProductVariantsParams{
		ProductID:  u.ToNullInt64(in.ProductID),
		PageOffset: in.Offset,
		PageLimit:  in.Limit,
	})
}

type CreateInput struct {
	ProductID  int64
	Label      string
	Attributes json.RawMessage
	IsActive   *bool
}

func (s *Service) Create(ctx context.Context, in CreateInput) (db.ProductVariant, error) {
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

	return s.q.CreateProductVariant(ctx, &db.CreateProductVariantParams{
		ProductID:  in.ProductID,
		Label:      label,
		Attributes: attrs,
		IsActive:   u.ToNullBool(in.IsActive),
	})
}

type UpdateInput struct {
	ID         int64
	Label      *string
	Attributes *json.RawMessage
	IsActive   *bool
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (db.ProductVariant, error) {
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

	return s.q.UpdateProductVariant(ctx, &db.UpdateProductVariantParams{
		Label:      u.ToNullString(in.Label),
		Attributes: attrs,
		IsActive:   u.ToNullBool(in.IsActive),
		ID:         in.ID,
	})
}

func (s *Service) Delete(ctx context.Context, id int64) (db.ProductVariant, error) {
	return s.q.DeleteProductVariant(ctx, id)
}
