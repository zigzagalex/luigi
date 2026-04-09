package accessories

import (
	"context"
	"database/sql"
	"strings"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

type accessoryQuerier interface {
	CreateAccessory(ctx context.Context, arg *db.CreateAccessoryParams) (db.Accessory, error)
	ListAccessories(ctx context.Context, arg *db.ListAccessoriesParams) ([]db.ListAccessoriesRow, error)
	GetAccessory(ctx context.Context, arg *db.GetAccessoryParams) (db.GetAccessoryRow, error)
	UpdateAccessory(ctx context.Context, arg *db.UpdateAccessoryParams) (db.Accessory, error)
	DeleteAccessory(ctx context.Context, id int64) (db.Accessory, error)

	UpsertAccessoryTranslation(ctx context.Context, arg *db.UpsertAccessoryTranslationParams) (db.AccessoryTranslation, error)
	GetAccessoryTranslations(ctx context.Context, accessoryID int64) ([]db.AccessoryTranslation, error)
	DeleteAccessoryTranslation(ctx context.Context, arg *db.DeleteAccessoryTranslationParams) error
}

type Service struct {
	q accessoryQuerier
}

func NewService(q db.Querier) *Service { return &Service{q: q} }

var ErrNotFound = sql.ErrNoRows

type ListInput struct {
	ShopID *int64
	Ids    []int64
	Locale string
	Limit  int32
	Offset int32
}

func (s *Service) List(ctx context.Context, in ListInput) ([]AccessoryDTO, error) {
	if in.Limit <= 0 || in.Limit > 200 {
		in.Limit = 50
	}
	if in.Offset < 0 {
		in.Offset = 0
	}

	rows, err := s.q.ListAccessories(ctx, &db.ListAccessoriesParams{
		ShopID:          u.ToNullInt64(in.ShopID),
		Ids:             in.Ids,
		RequestedLocale: in.Locale,
		PageOffset:      in.Offset,
		PageLimit:       in.Limit,
	})
	if err != nil {
		return nil, err
	}

	out := make([]AccessoryDTO, 0, len(rows))
	for _, row := range rows {
		out = append(out, AccessoryDTO{
			ID:                  row.ID,
			ShopID:              row.ShopID,
			SKU:                 toStringPtr(row.Sku),
			Name:                row.Name,
			Description:         toStringPtr(row.Description),
			DetailedDescription: toStringPtr(row.DetailedDescription),
			IsActive:            row.IsActive,
		})
	}
	return out, nil
}

func (s *Service) Get(ctx context.Context, id int64, locale string, includeTranslations bool) (AccessoryDTO, error) {
	row, err := s.q.GetAccessory(ctx, &db.GetAccessoryParams{
		ID:              id,
		RequestedLocale: locale,
	})
	if err != nil {
		return AccessoryDTO{}, err
	}

	dto := AccessoryDTO{
		ID:                  row.ID,
		ShopID:              row.ShopID,
		SKU:                 toStringPtr(row.Sku),
		Name:                row.Name,
		Description:         toStringPtr(row.Description),
		DetailedDescription: toStringPtr(row.DetailedDescription),
		IsActive:            row.IsActive,
	}

	if includeTranslations {
		trs, err := s.ListTranslations(ctx, id)
		if err != nil {
			return AccessoryDTO{}, err
		}
		dto.Translations = trs
	}

	return dto, nil
}

type CreateInput struct {
	ShopID      int64
	SKU         *string
	Name        string
	Description *string
	IsActive    *bool
}

func (s *Service) Create(ctx context.Context, in CreateInput) (db.Accessory, error) {
	return s.q.CreateAccessory(ctx, &db.CreateAccessoryParams{
		ShopID:      in.ShopID,
		Sku:         u.ToNullString(in.SKU),
		Name:        strings.TrimSpace(in.Name),
		Description: u.ToNullString(in.Description),
		IsActive:    u.ToNullBool(in.IsActive),
	})
}

type UpdateInput struct {
	ID          int64
	SKU         *string
	Name        *string
	Description *string
	IsActive    *bool
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (db.Accessory, error) {
	return s.q.UpdateAccessory(ctx, &db.UpdateAccessoryParams{
		ID:          in.ID,
		Sku:         u.ToNullString(in.SKU),
		Name:        u.ToNullString(in.Name),
		Description: u.ToNullString(in.Description),
		IsActive:    u.ToNullBool(in.IsActive),
	})
}

func (s *Service) Delete(ctx context.Context, id int64) (db.Accessory, error) {
	return s.q.DeleteAccessory(ctx, id)
}

type TranslationInput struct {
	AccessoryID         int64
	Locale              string
	Name                string
	Description         *string
	DetailedDescription *string
}

func (s *Service) UpsertTranslation(ctx context.Context, in TranslationInput) (db.AccessoryTranslation, error) {
	return s.q.UpsertAccessoryTranslation(ctx, &db.UpsertAccessoryTranslationParams{
		AccessoryID:         in.AccessoryID,
		Locale:              in.Locale,
		Name:                strings.TrimSpace(in.Name),
		Description:         u.ToNullString(in.Description),
		DetailedDescription: u.ToNullString(in.DetailedDescription),
	})
}

func (s *Service) ListTranslations(ctx context.Context, accessoryID int64) ([]AccessoryTranslationDTO, error) {
	rows, err := s.q.GetAccessoryTranslations(ctx, accessoryID)
	if err != nil {
		return nil, err
	}

	out := make([]AccessoryTranslationDTO, 0, len(rows))
	for _, row := range rows {
		out = append(out, AccessoryTranslationDTO{
			Locale:              row.Locale,
			Name:                row.Name,
			Description:         toStringPtr(row.Description),
			DetailedDescription: toStringPtr(row.DetailedDescription),
		})
	}
	return out, nil
}

func (s *Service) DeleteTranslation(ctx context.Context, accessoryID int64, locale string) error {
	return s.q.DeleteAccessoryTranslation(ctx, &db.DeleteAccessoryTranslationParams{
		AccessoryID: accessoryID,
		Locale:      locale,
	})
}
