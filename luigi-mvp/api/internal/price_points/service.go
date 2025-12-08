// internal/pricepoints/service.go
package pricepoints

import (
	"context"
	"database/sql"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
)

type pricePointQuerier interface {
	ListPricePoints(ctx context.Context) ([]db.PricePoint, error)
	GetPricePoint(ctx context.Context, arg *db.GetPricePointParams) (db.PricePoint, error)
	UpsertPricePoint(ctx context.Context, arg *db.UpsertPricePointParams) (db.PricePoint, error)
	DeletePricePoint(ctx context.Context, arg *db.DeletePricePointParams) error
}

type Service struct {
	q pricePointQuerier
}

func NewService(q db.Querier) *Service { return &Service{q: q} }

var ErrNotFound = sql.ErrNoRows

type PricePointDTO struct {
	PriceCategory   string `json:"price_category"`
	DayCount        int32  `json:"day_count"`
	PriceTotalCents int32  `json:"price_total_cents"`
}

func toDTO(pp db.PricePoint) PricePointDTO {
	return PricePointDTO{
		PriceCategory:   pp.PriceCategory,
		DayCount:        pp.DayCount,
		PriceTotalCents: pp.PriceTotalCents,
	}
}

// List all price points, optionally filtered by category
func (s *Service) List(ctx context.Context, priceCategory *string) ([]PricePointDTO, error) {
	items, err := s.q.ListPricePoints(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]PricePointDTO, 0, len(items))
	for _, pp := range items {
		if priceCategory != nil && pp.PriceCategory != *priceCategory {
			continue
		}
		out = append(out, toDTO(pp))
	}
	return out, nil
}

// Get a single price point by (category, day_count)
func (s *Service) Get(ctx context.Context, priceCategory string, dayCount int32) (PricePointDTO, error) {
	pp, err := s.q.GetPricePoint(ctx, &db.GetPricePointParams{
		PriceCategory: priceCategory,
		DayCount:      dayCount,
	})
	if err != nil {
		return PricePointDTO{}, err
	}
	return toDTO(pp), nil
}

type UpsertInput struct {
	PriceCategory   string
	DayCount        int32
	PriceTotalCents int32
}

// Create or update a price point
func (s *Service) Upsert(ctx context.Context, in UpsertInput) (PricePointDTO, error) {
	pp, err := s.q.UpsertPricePoint(ctx, &db.UpsertPricePointParams{
		PriceCategory:   in.PriceCategory,
		DayCount:        in.DayCount,
		PriceTotalCents: in.PriceTotalCents,
	})
	if err != nil {
		return PricePointDTO{}, err
	}
	return toDTO(pp), nil
}

// Delete a price point
func (s *Service) Delete(ctx context.Context, priceCategory string, dayCount int32) error {
	return s.q.DeletePricePoint(ctx, &db.DeletePricePointParams{
		PriceCategory: priceCategory,
		DayCount:      dayCount,
	})
}
