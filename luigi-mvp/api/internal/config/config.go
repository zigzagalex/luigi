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

	MediaBaseURL string

	S3Endpoint  string
	S3Bucket    string
	S3AccessKey string
	S3SecretKey string
	S3Region    string

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
	// Local Compose sets ENV=dev. Unset stays prod.
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
	endpoint, bucket, accessKey, secretKey, region := loadS3()

	var mediaBaseURL string
	if env == "prod" {
		mediaBaseURL = strings.TrimRight(must("MEDIA_BASE_URL"), "/")
	} else {
		// Public URL is this origin plus the object key. Path-style SeaweedFS
		// includes the bucket. Do not append an extra "/media".
		mediaBaseURL = strings.TrimRight(get("MEDIA_BASE_URL", "http://localhost:8333/"+bucket), "/")
	}

	sessionSecret := must("SESSION_SECRET")
	rejectProdDefaults(env, url, sessionSecret, secretKey)

	return Config{
		Env:             env,
		Port:            port,
		DatabaseURL:     url,
		MaxOpenConns:    10,
		MaxIdleConns:    5,
		ConnMaxIdle:     5 * time.Minute,
		ConnMaxLifetime: 30 * time.Minute,
		MediaBaseURL:    mediaBaseURL,
		S3Endpoint:      endpoint,
		S3Bucket:        bucket,
		S3AccessKey:     accessKey,
		S3SecretKey:     secretKey,
		S3Region:        region,
		SessionSecret:   sessionSecret,
		CORSOrigins:     loadCORSOrigins(),
		ShopID:          loadShopID(),
	}
}

func rejectProdDefaults(env, databaseURL, sessionSecret, s3Secret string) {
	if env != "prod" {
		return
	}
	switch {
	case sessionSecret == "dev-only-session-secret-change-me":
		panic("SESSION_SECRET is still the dev default")
	case s3Secret == "luigi-dev-secret":
		panic("S3_SECRET_KEY is still the dev default")
	case strings.Contains(databaseURL, "://luigi:luigi@"):
		panic("DATABASE_URL still uses the dev database password")
	}
}

func loadS3() (endpoint, bucket, accessKey, secretKey, region string) {
	endpoint = strings.TrimRight(mustTrim("S3_ENDPOINT"), "/")
	bucket = mustTrim("S3_BUCKET")
	accessKey = mustTrim("S3_ACCESS_KEY")
	secretKey = mustTrim("S3_SECRET_KEY")
	region = mustTrim("S3_REGION")
	return endpoint, bucket, accessKey, secretKey, region
}

func mustTrim(k string) string {
	v := strings.TrimSpace(os.Getenv(k))
	if v == "" {
		panic("missing required env: " + k)
	}
	return v
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
