package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Env             string
	Port            string
	DatabaseURL     string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxIdle     time.Duration
	ConnMaxLifetime time.Duration

	GCSBucketName string
	MediaBaseURL  string

	SessionSecret string

	CORSOrigins []string

	// ShopID is the deploy's shop when SHOP_ID is set. Requests still carry shop_id;
	// this value is what seed and the Next apps use for the one shop on this machine.
	ShopID int64
}

// soft-get with default
func get(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

// must-get for *secrets* you truly require
func must(k string) string {
	v := os.Getenv(k)
	if v == "" {
		panic("missing required env: " + k)
	}
	return v
}

func Load() Config {
	// Local Compose sets ENV=dev. Unset stays prod so a deploy that still
	// expects the GCS client does not silently switch to noop storage.
	env := get("ENV", "prod")
	port := get("PORT", "8080")

	if url := os.Getenv("DATABASE_URL"); url != "" {
		return base(env, port, url)
	}

	// TCP fallback for a laptop or a VPS. Host, port, and database name come from env.
	host := get("DB_HOST", "127.0.0.1")
	dbport := get("DB_PORT", "5432")
	user := must("DB_USER")
	pass := must("DB_PASSWORD")
	name := must("DB_NAME")

	url := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, pass, host, dbport, name)
	return base(env, port, url)
}

func base(env, port, url string) Config {
	var (
		gcsBucket    string
		mediaBaseURL string
	)

	if env == "prod" {
		// PROD
		gcsBucket = must("GCS_BUCKET_NAME")
		mediaBaseURL = must("MEDIA_BASE_URL")
	} else {
		// DEV
		gcsBucket = get("GCS_BUCKET_NAME", "")
		// Object keys in DB already start with "media/..." (see seed scripts). Base URL
		// must be the public origin that serves web-shop/public (Next dev server default).
		// Do not append "/media" here or URLs become ".../media/media/..." and 404.
		mediaBaseURL = get("MEDIA_BASE_URL", "http://localhost:3000")
	}

	return Config{
		Env:             env,
		Port:            port,
		DatabaseURL:     url,
		MaxOpenConns:    10,
		MaxIdleConns:    5,
		ConnMaxIdle:     5 * time.Minute,
		ConnMaxLifetime: 30 * time.Minute,
		GCSBucketName:   gcsBucket,
		MediaBaseURL:    mediaBaseURL,
		SessionSecret:   must("SESSION_SECRET"),
		CORSOrigins:     loadCORSOrigins(),
		ShopID:          loadShopID(),
	}
}

func loadShopID() int64 {
	raw := strings.TrimSpace(os.Getenv("SHOP_ID"))
	if raw == "" {
		return 0
	}
	n, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || n <= 0 {
		panic("SHOP_ID must be a positive integer")
	}
	return n
}

func loadCORSOrigins() []string {
	raw := strings.TrimSpace(must("CORS_ORIGINS"))

	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, p := range parts {
		o := strings.TrimSpace(p)
		if o == "" {
			continue
		}
		if o == "*" {
			panic("CORS_ORIGINS cannot be '*' when AllowCredentials is enabled; list explicit origins")
		}
		origins = append(origins, o)
	}
	if len(origins) == 0 {
		panic("CORS_ORIGINS is set but empty after parsing")
	}
	return origins
}
