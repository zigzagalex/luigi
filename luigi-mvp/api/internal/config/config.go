package config

import (
	"fmt"
	"os"
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
	env := get("ENV", "prod")            // default prod on Cloud Run
	port := get("PORT", "8080")          // Cloud Run injects PORT=8080 anyway

	// 1) If DATABASE_URL provided, trust it (works for both URL and DSN forms with pgx).
	if url := os.Getenv("DATABASE_URL"); url != "" {
		return base(env, port, url)
	}

	// 2) If Cloud SQL SOCKET variables are present, build a Unix socket DSN.
	// Required: DB_INSTANCE, DB_USER, DB_PASSWORD, DB_NAME
	if os.Getenv("DB_INSTANCE") != "" {
		url := fmt.Sprintf(
			"host=/cloudsql/%s user=%s password=%s dbname=%s sslmode=disable",
			must("DB_INSTANCE"), must("DB_USER"), must("DB_PASSWORD"), must("DB_NAME"),
		)
		return base(env, port, url)
	}

	// 3) Fall back to TCP (local dev, Docker, or public IP Cloud SQL)
	// Use DB_HOST (default 127.0.0.1), DB_PORT (default 5432)
	host := get("DB_HOST", "127.0.0.1")
	dbport := get("DB_PORT", "5432")
	user := must("DB_USER")
	pass := must("DB_PASSWORD")
	name := must("DB_NAME")

	// For pgx stdlib you can use URL or DSN. URL is cleaner:
	// If you need SSL on public IP, change sslmode=require.
	url := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, pass, host, dbport, name)
	return base(env, port, url)
}

func base(env, port, url string) Config {
	return Config{
		Env:             env,
		Port:            port,
		DatabaseURL:     url,
		MaxOpenConns:    10,
		MaxIdleConns:    5,
		ConnMaxIdle:     5 * time.Minute,
		ConnMaxLifetime: 30 * time.Minute,
	}
}
