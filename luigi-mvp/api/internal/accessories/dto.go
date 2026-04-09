package accessories

import "database/sql"

type AccessoryDTO struct {
	ID                  int64                     `json:"id"`
	ShopID              int64                     `json:"shop_id"`
	SKU                 *string                   `json:"sku,omitempty"`
	Name                string                    `json:"name"`
	Description         *string                   `json:"description,omitempty"`
	DetailedDescription *string                   `json:"detailed_description,omitempty"`
	IsActive            bool                      `json:"is_active"`
	Translations        []AccessoryTranslationDTO `json:"translations,omitempty"`
}

type AccessoryTranslationDTO struct {
	Locale              string  `json:"locale"`
	Name                string  `json:"name"`
	Description         *string `json:"description,omitempty"`
	DetailedDescription *string `json:"detailed_description,omitempty"`
}

func toStringPtr(ns sql.NullString) *string {
	if !ns.Valid {
		return nil
	}
	s := ns.String
	return &s
}
