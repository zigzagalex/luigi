package dbutil

import (
	"database/sql"
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
