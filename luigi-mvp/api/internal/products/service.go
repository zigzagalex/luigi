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
	ListProductsWithPrimaryImage(ctx context.Context, arg *db.ListProductsWithPrimaryImageParams) ([]db.ListProductsWithPrimaryImageRow, error)
	UpdateProduct(ctx context.Context, arg *db.UpdateProductParams) (db.Product, error)
	DeleteProduct(ctx context.Context, id int64) (db.Product, error)
	ListCategoriesForProduct(ctx context.Context, productID int64) ([]db.ProductCategory, error)

	GetProduct(ctx context.Context, id int64) (db.Product, error) 
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

func (s *Service) Get(ctx context.Context, id int64) (db.Product, error) {
    return s.q.GetProduct(ctx, id)
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

type ListWithImageInput struct {
	ShopID *int64
	Limit  int32
	Offset int32
}

// Raw rows, used internally if needed
func (s *Service) ListWithPrimaryImage(ctx context.Context, in ListWithImageInput) ([]db.ListProductsWithPrimaryImageRow, error) {
	if in.Limit <= 0 || in.Limit > 200 {
		in.Limit = 50
	}
	if in.Offset < 0 {
		in.Offset = 0
	}

	return s.q.ListProductsWithPrimaryImage(ctx, &db.ListProductsWithPrimaryImageParams{
		ShopID:     u.ToNullInt64(in.ShopID),
		PageOffset: in.Offset,
		PageLimit:  in.Limit,
	})
}

// High-level API: ready-to-serve DTOs with image URL + categories
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
		// base product + primary image
		dto := RowToDTO(row, mediaBaseURL)

		// attach categories from product_category_assignments
		if err := s.attachCategories(ctx, &dto); err != nil {
			return nil, err
		}

		out = append(out, dto)
	}

	return out, nil
}

// GetDTO returns a single product as a ProductDTO, including categories.
// PrimaryImageURL is left nil here
func (s *Service) GetDTO(ctx context.Context, id int64) (ProductDTO, error) {
	p, err := s.q.GetProduct(ctx, id)
	if err != nil {
		return ProductDTO{}, err // ErrNotFound bubbles up as-is
	}

	dto := ProductDTO{
		ID:              p.ID,
		ShopID:          p.ShopID,
		SKU:             toStringPtr(p.Sku),
		Name:            p.Name,
		Description:     toStringPtr(p.Description),
		PriceCategory:   p.PriceCategory,
		IsActive:        p.IsActive,
		PrimaryImageURL: nil, // detail page uses the gallery; no primary image here
		Categories:      nil,
	}

	// Attach categories like on the list endpoint
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
