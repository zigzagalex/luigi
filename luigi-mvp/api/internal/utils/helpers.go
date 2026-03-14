package dbutil

import (
	"database/sql"
	"net/http"
	"strings"
)

// ToNullString converts *string → sql.NullString, trimming whitespace.
// Empty or nil → NULL.
func ToNullString(p *string) sql.NullString {
	if p == nil {
		return sql.NullString{Valid: false}
	}
	s := strings.TrimSpace(*p)
	if s == "" {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: s, Valid: true}
}

// ToNullInt64 converts *int64 → sql.NullInt64.
// Nil → NULL.
func ToNullInt64(p *int64) sql.NullInt64 {
	if p == nil {
		return sql.NullInt64{Valid: false}
	}
	return sql.NullInt64{Int64: *p, Valid: true}
}

// ToNullInt32 converts *int32 → sql.NullInt32.
// Nil → NULL.
func ToNullInt32(p *int32) sql.NullInt32 {
	if p == nil {
		return sql.NullInt32{Valid: false}
	}
	return sql.NullInt32{Int32: *p, Valid: true}
}

// ToNullBool converts *bool → sql.NullBool.
// Nil → NULL.
func ToNullBool(p *bool) sql.NullBool {
	if p == nil {
		return sql.NullBool{Valid: false}
	}
	return sql.NullBool{Bool: *p, Valid: true}
}

// DerefOr returns the dereferenced value of a string pointer
// or a default if the pointer is nil.
func DerefOr(p *string, def string) string {
	if p == nil {
		return def
	}
	return *p
}

func TrimOrNil(p *string) *string {
	if p == nil {
		return nil
	}
	s := strings.TrimSpace(*p)
	if s == "" {
		return nil
	}
	return &s
}

func NullStringPtr(ns sql.NullString) *string {
	if !ns.Valid {
		return nil
	}
	v := strings.TrimSpace(ns.String)
	if v == "" {
		return nil
	}
	return &v
}

// getLocale checks ?locale= query param first, then Accept-Language header, falls back to 'de'
func GetLocale(r *http.Request) string {
	// Check query param ?locale=en
	if l := strings.TrimSpace(r.URL.Query().Get("locale")); l != "" {
		return l
	}

	// Check Accept-Language header (very basic check, e.g., "en-US,en;q=0.9")
	if lang := r.Header.Get("Accept-Language"); lang != "" {
		// Just take the first two characters (e.g., 'en', 'de', 'fr')
		// In a production app, you might want a more robust parser for q-factors
		parts := strings.Split(lang, ",")
		if len(parts) > 0 {
			first := strings.TrimSpace(parts[0])
			if len(first) >= 2 {
				return strings.ToLower(first[:2])
			}
		}
	}

	// Ultimate fallback
	return "de"
}
