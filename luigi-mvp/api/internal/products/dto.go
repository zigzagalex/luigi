package products

import (
	"database/sql"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
)

type ProductCategoryDTO struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

type ProductDTO struct {
	ID              int64                `json:"id"`
	ShopID          int64                `json:"shop_id"`
	SKU             *string              `json:"sku,omitempty"`
	Name            string               `json:"name"`
	Description     *string              `json:"description,omitempty"`
	PriceCategory   string               `json:"price_category"`
	IsActive        bool                 `json:"is_active"`
	PrimaryImageURL *string              `json:"primary_image_url,omitempty"`
	Categories      []ProductCategoryDTO `json:"categories,omitempty"`
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
		ID:              row.ID,
		ShopID:          row.ShopID,
		SKU:             toStringPtr(row.Sku),
		Name:            row.Name,
		Description:     toStringPtr(row.Description),
		PriceCategory:   row.PriceCategory,
		IsActive:        row.IsActive,
		PrimaryImageURL: primaryURL,
		Categories:      nil,
	}
}
