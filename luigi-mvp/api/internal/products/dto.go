package products

import (
	"database/sql"
	"time"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
)

type ProductCategoryDTO struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

type ProductDTO struct {
	ID                  int64                   `json:"id"`
	ShopID              int64                   `json:"shop_id"`
	SKU                 *string                 `json:"sku,omitempty"`
	Name                string                  `json:"name"`
	Description         *string                 `json:"description,omitempty"`
	DetailedDescription *string                 `json:"detailed_description,omitempty"`
	PriceCategory       string                  `json:"price_category"`
	IsAccessory         bool                    `json:"is_accessory"`
	IsActive            bool                    `json:"is_active"`
	PrimaryImageURL     *string                 `json:"primary_image_url,omitempty"`
	Categories          []ProductCategoryDTO    `json:"categories,omitempty"`
	Translations        []ProductTranslationDTO `json:"translations,omitempty"`
}

type ProductTranslationDTO struct {
	Locale              string  `json:"locale"`
	Name                string  `json:"name"`
	Description         *string `json:"description,omitempty"`
	DetailedDescription *string `json:"detailed_description,omitempty"`
}

// ProductWriteResponse is returned by POST/PUT /v1/products. sqlc rows use sql.NullString,
// which json-marshals as {"String","Valid"} and breaks clients that expect sku as a string.
type ProductWriteResponse struct {
	ID            int64     `json:"id"`
	ShopID        int64     `json:"shop_id"`
	SKU           *string   `json:"sku,omitempty"`
	Name          string    `json:"name"`
	Description   *string   `json:"description,omitempty"`
	PriceCategory string    `json:"price_category"`
	IsAccessory   bool      `json:"is_accessory"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func NewProductWriteResponseFromCreate(row db.CreateProductRow) ProductWriteResponse {
	return ProductWriteResponse{
		ID:            row.ID,
		ShopID:        row.ShopID,
		SKU:           toStringPtr(row.Sku),
		Name:          row.Name,
		Description:   toStringPtr(row.Description),
		PriceCategory: row.PriceCategory,
		IsAccessory:   row.IsAccessory,
		IsActive:      row.IsActive,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
	}
}

func NewProductWriteResponseFromUpdate(row db.UpdateProductRow) ProductWriteResponse {
	return ProductWriteResponse{
		ID:            row.ID,
		ShopID:        row.ShopID,
		SKU:           toStringPtr(row.Sku),
		Name:          row.Name,
		Description:   toStringPtr(row.Description),
		PriceCategory: row.PriceCategory,
		IsAccessory:   row.IsAccessory,
		IsActive:      row.IsActive,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
	}
}

func NewProductWriteResponseFromDelete(row db.DeleteProductRow) ProductWriteResponse {
	return ProductWriteResponse{
		ID:            row.ID,
		ShopID:        row.ShopID,
		SKU:           toStringPtr(row.Sku),
		Name:          row.Name,
		Description:   toStringPtr(row.Description),
		PriceCategory: row.PriceCategory,
		IsAccessory:   row.IsAccessory,
		IsActive:      row.IsActive,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
	}
}

func toStringPtr(ns sql.NullString) *string {
	if !ns.Valid {
		return nil
	}
	s := ns.String
	return &s
}

// mediaBaseURL e.g. "https://media.example.com"
func RowToDTO(row db.ListProductsWithPrimaryImageRow, mediaBaseURL string) ProductDTO {
	var primaryURL *string
	if row.PrimaryImageObjectKey != "" {
		u := mediaBaseURL + "/" + row.PrimaryImageObjectKey
		primaryURL = &u
	}

	return ProductDTO{
		ID:                  row.ID,
		ShopID:              row.ShopID,
		SKU:                 toStringPtr(row.Sku),
		Name:                row.Name,
		Description:         toStringPtr(row.Description),
		DetailedDescription: toStringPtr(row.DetailedDescription),
		PriceCategory:       row.PriceCategory,
		IsAccessory:         row.IsAccessory,
		IsActive:            row.IsActive,
		PrimaryImageURL:     primaryURL,
		Categories:          nil,
		Translations:        nil,
	}
}
