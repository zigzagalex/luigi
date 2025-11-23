package categories

import (
	"context"
	"database/sql"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

var ErrNotFound = sql.ErrNoRows

type categoryQuerier interface {
	CreateProductCategory(ctx context.Context, arg *db.CreateProductCategoryParams) (db.ProductCategory, error)
	GetProductCategory(ctx context.Context, id int64) (db.ProductCategory, error)
	UpdateProductCategory(ctx context.Context, arg *db.UpdateProductCategoryParams) (db.ProductCategory, error)
	DeleteProductCategory(ctx context.Context, id int64) (db.ProductCategory, error)

	ListCategoriesByShop(ctx context.Context, shopID int64) ([]db.ProductCategory, error)

	AssignProductToCategory(ctx context.Context, arg *db.AssignProductToCategoryParams) error
	ClearProductCategories(ctx context.Context, productID int64) error
	ListCategoriesForProduct(ctx context.Context, productID int64) ([]db.ProductCategory, error)
}

type Service struct {
	q categoryQuerier
}

func NewService(q db.Querier) *Service {
	return &Service{q: q}
}

type CreateCategoryInput struct {
	ShopID      int64
	ParentID    *int64
	Slug        string
	Name        string
	Description *string
	SortOrder   *int32
	IsActive    *bool
}

type UpdateCategoryInput struct {
	ParentID    *int64
	Slug        *string
	Name        *string
	Description *string
	SortOrder   *int32
	IsActive    *bool
}

func (s *Service) CreateCategory(ctx context.Context, in CreateCategoryInput) (CategoryDTO, error) {
	arg := &db.CreateProductCategoryParams{
		ShopID:      in.ShopID,
		ParentID:    u.ToNullInt64(in.ParentID),
		Slug:        in.Slug,
		Name:        in.Name,
		Description: u.ToNullString(in.Description),
		SortOrder:   u.ToNullInt32(in.SortOrder), // nil → default 0 via COALESCE in SQL
		IsActive:    u.ToNullBool(in.IsActive),   // nil → default true via COALESCE in SQL
	}

	cat, err := s.q.CreateProductCategory(ctx, arg)
	if err != nil {
		return CategoryDTO{}, err
	}
	return toDTO(cat), nil
}

func (s *Service) GetCategory(ctx context.Context, id int64) (CategoryDTO, error) {
	cat, err := s.q.GetProductCategory(ctx, id)
	if err != nil {
		return CategoryDTO{}, err
	}
	return toDTO(cat), nil
}

func (s *Service) UpdateCategory(ctx context.Context, id int64, in UpdateCategoryInput) (CategoryDTO, error) {
	arg := &db.UpdateProductCategoryParams{
		ID:          id,
		ParentID:    u.ToNullInt64(in.ParentID),
		Slug:        u.ToNullString(in.Slug),
		Name:        u.ToNullString(in.Name),
		Description: u.ToNullString(in.Description),
		SortOrder:   u.ToNullInt32(in.SortOrder),
		IsActive:    u.ToNullBool(in.IsActive),
	}

	cat, err := s.q.UpdateProductCategory(ctx, arg)
	if err != nil {
		return CategoryDTO{}, err
	}
	return toDTO(cat), nil
}

func (s *Service) DeleteCategory(ctx context.Context, id int64) error {
	_, err := s.q.DeleteProductCategory(ctx, id)
	return err
}

func (s *Service) ListCategories(ctx context.Context, shopID int64) ([]CategoryDTO, error) {
	cats, err := s.q.ListCategoriesByShop(ctx, shopID)
	if err != nil {
		return nil, err
	}

	out := make([]CategoryDTO, 0, len(cats))
	for _, c := range cats {
		out = append(out, toDTO(c))
	}
	return out, nil
}

// Tree structure: returns only root categories with nested Children.
func (s *Service) ListCategoryTree(ctx context.Context, shopID int64) ([]*CategoryDTO, error) {
	cats, err := s.q.ListCategoriesByShop(ctx, shopID)
	if err != nil {
		return nil, err
	}

	byID := make(map[int64]*CategoryDTO, len(cats))
	var roots []*CategoryDTO

	// build nodes
	for _, c := range cats {
		dto := toDTO(c)
		dto.Children = []*CategoryDTO{}
		byID[dto.ID] = &dto
	}

	// link parents/children
	for _, node := range byID {
		if node.ParentID == nil {
			roots = append(roots, node)
			continue
		}
		parent := byID[*node.ParentID]
		if parent == nil {
			// orphan → treat as root rather than panicking
			roots = append(roots, node)
			continue
		}
		parent.Children = append(parent.Children, node)
	}

	return roots, nil
}

// ReplaceProductCategories wipes all category assignments for a product
// and assigns exactly the given list.
func (s *Service) ReplaceProductCategories(ctx context.Context, productID int64, categoryIDs []int64) error {
	if err := s.q.ClearProductCategories(ctx, productID); err != nil {
		return err
	}

	for _, cid := range categoryIDs {
		err := s.q.AssignProductToCategory(ctx, &db.AssignProductToCategoryParams{
			ProductID:  productID,
			CategoryID: cid,
		})
		if err != nil {
			return err
		}
	}

	return nil
}

func (s *Service) ListProductCategories(ctx context.Context, productID int64) ([]CategoryDTO, error) {
	cats, err := s.q.ListCategoriesForProduct(ctx, productID)
	if err != nil {
		return nil, err
	}

	out := make([]CategoryDTO, 0, len(cats))
	for _, c := range cats {
		out = append(out, toDTO(c))
	}
	return out, nil
}
