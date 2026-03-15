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
	ListProducts(ctx context.Context, arg *db.ListProductsParams) ([]db.ListProductsRow, error)
	ListProductsWithPrimaryImage(ctx context.Context, arg *db.ListProductsWithPrimaryImageParams) ([]db.ListProductsWithPrimaryImageRow, error)
	UpdateProduct(ctx context.Context, arg *db.UpdateProductParams) (db.Product, error)
	DeleteProduct(ctx context.Context, id int64) (db.Product, error)
	ListCategoriesForProduct(ctx context.Context, productID int64) ([]db.ProductCategory, error)

	GetProduct(ctx context.Context, arg *db.GetProductParams) (db.GetProductRow, error)

	UpsertProductTranslation(ctx context.Context, arg *db.UpsertProductTranslationParams) (db.ProductTranslation, error)
}

type Service struct {
	q productQuerier
}

func NewService(q db.Querier) *Service { return &Service{q: q} }

var ErrNotFound = sql.ErrNoRows

type ListInput struct {
	ShopID *int64
	Locale string
	Limit  int32
	Offset int32
}

func (s *Service) List(ctx context.Context, in ListInput) ([]db.ListProductsRow, error) {
	if in.Limit <= 0 || in.Limit > 200 {
		in.Limit = 50
	}
	if in.Offset < 0 {
		in.Offset = 0
	}

	return s.q.ListProducts(ctx, &db.ListProductsParams{
		ShopID:          u.ToNullInt64(in.ShopID),
		RequestedLocale: in.Locale,
		PageOffset:      in.Offset,
		PageLimit:       in.Limit,
	})
}

func (s *Service) Get(ctx context.Context, id int64, locale string) (db.GetProductRow, error) {
	return s.q.GetProduct(ctx, &db.GetProductParams{
		ID:              id,
		RequestedLocale: locale,
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

type ListWithImageInput struct {
	ShopID *int64
	Locale string
	Ids    []int64
	Limit  int32
	Offset int32
}

func (s *Service) ListWithPrimaryImage(ctx context.Context, in ListWithImageInput) ([]db.ListProductsWithPrimaryImageRow, error) {
	if in.Limit <= 0 || in.Limit > 200 {
		in.Limit = 50
	}
	if in.Offset < 0 {
		in.Offset = 0
	}

	return s.q.ListProductsWithPrimaryImage(ctx, &db.ListProductsWithPrimaryImageParams{
		ShopID:          u.ToNullInt64(in.ShopID),
		RequestedLocale: in.Locale,
		Ids:             in.Ids,
		PageOffset:      in.Offset,
		PageLimit:       in.Limit,
	})
}

func (s *Service) ListWithPrimaryImageDTO(
	ctx context.Context,
	in ListWithImageInput,
	mediaBaseURL string,
) ([]ProductDTO, error) {
	rows, err := s.ListWithPrimaryImage(ctx, in)
	if err != nil {
		return nil, err
	}

	out := make([]ProductDTO, 0, len(rows))
	for _, row := range rows {
		dto := RowToDTO(row, mediaBaseURL)
		if err := s.attachCategories(ctx, &dto); err != nil {
			return nil, err
		}
		out = append(out, dto)
	}

	return out, nil
}

func (s *Service) GetDTO(ctx context.Context, id int64, locale string) (ProductDTO, error) {
	p, err := s.Get(ctx, id, locale)
	if err != nil {
		return ProductDTO{}, err
	}

	dto := ProductDTO{
		ID:            p.ID,
		ShopID:        p.ShopID,
		SKU:           toStringPtr(p.Sku),
		Name:          p.Name,
		Description:   toStringPtr(p.Description),
		PriceCategory: p.PriceCategory,
		IsActive:      p.IsActive,
		Categories:    nil,
	}

	if err := s.attachCategories(ctx, &dto); err != nil {
		return ProductDTO{}, err
	}

	return dto, nil
}

func (s *Service) attachCategories(ctx context.Context, dto *ProductDTO) error {
	cats, err := s.q.ListCategoriesForProduct(ctx, dto.ID)
	if err != nil {
		return err
	}

	out := make([]ProductCategoryDTO, 0, len(cats))
	for _, c := range cats {
		out = append(out, ProductCategoryDTO{
			ID:   c.ID,
			Name: c.Name,
			Slug: c.Slug,
		})
	}
	dto.Categories = out
	return nil
}

type TranslationInput struct {
	ProductID   int64
	Locale      string
	Name        string
	Description *string
}

func (s *Service) UpsertTranslation(ctx context.Context, in TranslationInput) (db.ProductTranslation, error) {
	return s.q.UpsertProductTranslation(ctx, &db.UpsertProductTranslationParams{
		ProductID:   in.ProductID,
		Locale:      in.Locale,
		Name:        strings.TrimSpace(in.Name),
		Description: u.ToNullString(in.Description),
	})
}
