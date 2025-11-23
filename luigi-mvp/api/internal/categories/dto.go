package categories

import (
	"database/sql"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
)

type CategoryDTO struct {
	ID          int64          `json:"id"`
	ShopID      int64          `json:"shop_id"`
	ParentID    *int64         `json:"parent_id,omitempty"`
	Slug        string         `json:"slug"`
	Name        string         `json:"name"`
	Description *string        `json:"description,omitempty"`
	SortOrder   int32          `json:"sort_order"`
	IsActive    bool           `json:"is_active"`
	Children    []*CategoryDTO `json:"children,omitempty"`
}

func toInt64Ptr(n sql.NullInt64) *int64 {
	if !n.Valid {
		return nil
	}
	v := n.Int64
	return &v
}

func toStringPtr(ns sql.NullString) *string {
	if !ns.Valid {
		return nil
	}
	s := ns.String
	return &s
}

// internal: db row -> DTO
func toDTO(c db.ProductCategory) CategoryDTO {
	return CategoryDTO{
		ID:          c.ID,
		ShopID:      c.ShopID,
		ParentID:    toInt64Ptr(c.ParentID),
		Slug:        c.Slug,
		Name:        c.Name,
		Description: toStringPtr(c.Description),
		SortOrder:   c.SortOrder,
		IsActive:    c.IsActive,
	}
}
