package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"

	"github.com/zigzagalex/luigi/api/internal/auth"
)

func main() {
	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	email := strings.TrimSpace(get("SEED_ADMIN_EMAIL", "admin@localhost"))
	password := get("SEED_ADMIN_PASSWORD", "Admin123!")
	displayName := get("SEED_ADMIN_NAME", "Local Admin")
	phone := get("SEED_ADMIN_PHONE", "+41000000000")

	hash, err := auth.HashPassword(password)
	if err != nil {
		log.Fatalf("hash password: %v", err)
	}

	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		log.Fatalf("ping db: %v", err)
	}

	shopID, err := ensureShop(ctx, db)
	if err != nil {
		log.Fatalf("ensure shop: %v", err)
	}

	var userID int64
	err = db.QueryRowContext(ctx, `
INSERT INTO users (
  shop_id, email, phone, display_name, password_hash, role, is_active
) VALUES (
  $1, $2, $3, $4, $5, 'admin', TRUE
)
ON CONFLICT (email) DO UPDATE SET
  shop_id = EXCLUDED.shop_id,
  phone = EXCLUDED.phone,
  display_name = EXCLUDED.display_name,
  password_hash = EXCLUDED.password_hash,
  role = 'admin',
  is_active = TRUE,
  updated_at = now()
RETURNING id
`, shopID, email, phone, displayName, hash).Scan(&userID)
	if err != nil {
		log.Fatalf("upsert admin: %v", err)
	}

	fmt.Printf("seeded admin id=%d email=%s shop_id=%d\n", userID, email, shopID)
	fmt.Printf("password: %s\n", password)
}

func ensureShop(ctx context.Context, db *sql.DB) (int64, error) {
	var id int64
	err := db.QueryRowContext(ctx, `SELECT id FROM shops ORDER BY id LIMIT 1`).Scan(&id)
	if err == nil {
		return id, nil
	}
	if err != sql.ErrNoRows {
		return 0, err
	}

	err = db.QueryRowContext(ctx, `
INSERT INTO shops (name, timezone, is_active)
VALUES ('Luigi''s Bike Shop', 'Europe/Zurich', TRUE)
RETURNING id
`).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("insert shop: %w", err)
	}
	return id, nil
}

func get(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
