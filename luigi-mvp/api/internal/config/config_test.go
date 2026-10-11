package config

import (
	"strings"
	"testing"
)

func TestLoadPrefersDatabaseURLOverHostParts(t *testing.T) {
	t.Setenv("ENV", "dev")
	t.Setenv("DATABASE_URL", "postgres://u:p@db:5432/luigi?sslmode=disable")
	t.Setenv("DB_HOST", "127.0.0.1")
	t.Setenv("DB_INSTANCE", "proj:region:inst")
	t.Setenv("SESSION_SECRET", "s")
	t.Setenv("CORS_ORIGINS", "http://localhost:3000, http://localhost:3001")
	t.Setenv("SHOP_ID", "1")
	t.Setenv("MEDIA_BASE_URL", "")

	cfg := Load()
	if cfg.DatabaseURL != "postgres://u:p@db:5432/luigi?sslmode=disable" {
		t.Fatalf("database url = %q", cfg.DatabaseURL)
	}
	if strings.Contains(cfg.DatabaseURL, "cloudsql") {
		t.Fatalf("database url still points at Cloud SQL: %q", cfg.DatabaseURL)
	}
	if cfg.ShopID != 1 {
		t.Fatalf("shop id = %d", cfg.ShopID)
	}
	if len(cfg.CORSOrigins) != 2 || cfg.CORSOrigins[1] != "http://localhost:3001" {
		t.Fatalf("cors = %#v", cfg.CORSOrigins)
	}
}

func TestLoadTCPFallbackIgnoresCloudSQLInstance(t *testing.T) {
	t.Setenv("ENV", "dev")
	t.Setenv("DATABASE_URL", "")
	t.Setenv("DB_INSTANCE", "proj:region:inst")
	t.Setenv("DB_USER", "u")
	t.Setenv("DB_PASSWORD", "p")
	t.Setenv("DB_NAME", "luigi")
	t.Setenv("DB_HOST", "127.0.0.1")
	t.Setenv("DB_PORT", "5432")
	t.Setenv("SESSION_SECRET", "s")
	t.Setenv("CORS_ORIGINS", "http://localhost:3000")
	t.Setenv("SHOP_ID", "")

	cfg := Load()
	want := "postgres://u:p@127.0.0.1:5432/luigi?sslmode=disable"
	if cfg.DatabaseURL != want {
		t.Fatalf("database url = %q, want %q", cfg.DatabaseURL, want)
	}
	if cfg.ShopID != 0 {
		t.Fatalf("shop id = %d, want unset", cfg.ShopID)
	}
}

func TestLoadRejectsBadShopID(t *testing.T) {
	t.Setenv("ENV", "dev")
	t.Setenv("DATABASE_URL", "postgres://u:p@db:5432/luigi?sslmode=disable")
	t.Setenv("SESSION_SECRET", "s")
	t.Setenv("CORS_ORIGINS", "http://localhost:3000")
	t.Setenv("SHOP_ID", "nope")

	defer func() {
		if recover() == nil {
			t.Fatal("expected panic for invalid SHOP_ID")
		}
	}()
	Load()
}
