package config

import "testing"

func setS3Env(t *testing.T) {
	t.Helper()
	t.Setenv("S3_ENDPOINT", "http://seaweedfs:8333/")
	t.Setenv("S3_BUCKET", "luigi")
	t.Setenv("S3_ACCESS_KEY", "luigi")
	t.Setenv("S3_SECRET_KEY", "luigi-dev-secret")
	t.Setenv("S3_REGION", "us-east-1")
}

func TestLoadPrefersDatabaseURLOverHostParts(t *testing.T) {
	t.Setenv("ENV", "dev")
	t.Setenv("DATABASE_URL", "postgres://u:p@db:5432/luigi?sslmode=disable")
	t.Setenv("DB_HOST", "127.0.0.1")
	t.Setenv("SESSION_SECRET", "s")
	t.Setenv("CORS_ORIGINS", "http://localhost:3000, http://localhost:3001")
	t.Setenv("SHOP_ID", "1")
	t.Setenv("MEDIA_BASE_URL", "")
	setS3Env(t)

	cfg := Load()
	if cfg.DatabaseURL != "postgres://u:p@db:5432/luigi?sslmode=disable" {
		t.Fatalf("database url = %q", cfg.DatabaseURL)
	}
	if cfg.ShopID != 1 {
		t.Fatalf("shop id = %d", cfg.ShopID)
	}
	if len(cfg.CORSOrigins) != 2 || cfg.CORSOrigins[1] != "http://localhost:3001" {
		t.Fatalf("cors = %#v", cfg.CORSOrigins)
	}
	if cfg.S3Endpoint != "http://seaweedfs:8333" || cfg.S3Bucket != "luigi" || cfg.S3Region != "us-east-1" {
		t.Fatalf("s3 = endpoint %q bucket %q region %q", cfg.S3Endpoint, cfg.S3Bucket, cfg.S3Region)
	}
	if cfg.MediaBaseURL != "http://localhost:8333/luigi" {
		t.Fatalf("media base = %q", cfg.MediaBaseURL)
	}
}

func TestLoadTCPFallback(t *testing.T) {
	t.Setenv("ENV", "dev")
	t.Setenv("DATABASE_URL", "")
	t.Setenv("DB_USER", "u")
	t.Setenv("DB_PASSWORD", "p")
	t.Setenv("DB_NAME", "luigi")
	t.Setenv("DB_HOST", "127.0.0.1")
	t.Setenv("DB_PORT", "5432")
	t.Setenv("SESSION_SECRET", "s")
	t.Setenv("CORS_ORIGINS", "http://localhost:3000")
	t.Setenv("SHOP_ID", "")
	setS3Env(t)

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
	setS3Env(t)

	defer func() {
		if recover() == nil {
			t.Fatal("expected panic for invalid SHOP_ID")
		}
	}()
	Load()
}

func TestLoadProdReadsS3AndMediaBase(t *testing.T) {
	t.Setenv("ENV", "prod")
	t.Setenv("DATABASE_URL", "postgres://u:p@db:5432/luigi?sslmode=disable")
	t.Setenv("SESSION_SECRET", "s")
	t.Setenv("CORS_ORIGINS", "http://localhost:3000")
	t.Setenv("MEDIA_BASE_URL", "http://localhost:8333/luigi")
	setS3Env(t)
	t.Setenv("S3_SECRET_KEY", "prod-secret")

	cfg := Load()
	if cfg.MediaBaseURL != "http://localhost:8333/luigi" {
		t.Fatalf("media base = %q", cfg.MediaBaseURL)
	}
	if cfg.S3AccessKey != "luigi" || cfg.S3SecretKey != "prod-secret" {
		t.Fatal("s3 credentials were not loaded")
	}
}

func TestLoadProdRejectsDevDefaults(t *testing.T) {
	t.Setenv("ENV", "prod")
	t.Setenv("DATABASE_URL", "postgres://u:p@db:5432/luigi?sslmode=disable")
	t.Setenv("SESSION_SECRET", "dev-only-session-secret-change-me")
	t.Setenv("CORS_ORIGINS", "https://shop.example")
	t.Setenv("MEDIA_BASE_URL", "https://media.example/luigi")
	setS3Env(t)
	t.Setenv("S3_SECRET_KEY", "prod-secret")

	defer func() {
		if recover() == nil {
			t.Fatal("expected panic for dev session secret")
		}
	}()
	Load()
}
