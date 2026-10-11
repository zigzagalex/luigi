package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strconv"
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

	resetPassword := strings.EqualFold(strings.TrimSpace(os.Getenv("SEED_ADMIN_RESET")), "true")
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

	passwordUpdate := ""
	if resetPassword {
		passwordUpdate = "password_hash = EXCLUDED.password_hash,"
	}
	var userID int64
	err = db.QueryRowContext(ctx, fmt.Sprintf(`
INSERT INTO users (
  shop_id, email, phone, display_name, password_hash, role, is_active
) VALUES (
  $1, $2, $3, $4, $5, 'admin', TRUE
)
ON CONFLICT (email) DO UPDATE SET
  shop_id = EXCLUDED.shop_id,
  phone = EXCLUDED.phone,
  display_name = EXCLUDED.display_name,
  %s
  role = 'admin',
  is_active = TRUE,
  updated_at = now()
RETURNING id
`, passwordUpdate), shopID, email, phone, displayName, hash).Scan(&userID)
	if err != nil {
		log.Fatalf("upsert admin: %v", err)
	}

	fmt.Printf("seeded admin id=%d email=%s shop_id=%d\n", userID, email, shopID)
}

func ensureShop(ctx context.Context, db *sql.DB) (int64, error) {
	if raw := strings.TrimSpace(os.Getenv("SHOP_ID")); raw != "" {
		want, err := strconv.ParseInt(raw, 10, 64)
		if err != nil || want <= 0 {
			return 0, fmt.Errorf("SHOP_ID must be a positive integer")
		}
		return ensureShopID(ctx, db, want)
	}

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

func ensureShopID(ctx context.Context, db *sql.DB, want int64) (int64, error) {
	var id int64
	err := db.QueryRowContext(ctx, `SELECT id FROM shops WHERE id = $1`, want).Scan(&id)
	if err == nil {
		return id, nil
	}
	if err != sql.ErrNoRows {
		return 0, err
	}

	err = db.QueryRowContext(ctx, `
INSERT INTO shops (id, name, timezone, is_active)
VALUES ($1, 'Luigi''s Bike Shop', 'Europe/Zurich', TRUE)
RETURNING id
`, want).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("insert shop %d: %w", want, err)
	}

	if _, err := db.ExecContext(ctx, `
SELECT setval(pg_get_serial_sequence('shops', 'id'), (SELECT MAX(id) FROM shops))
`); err != nil {
		return 0, fmt.Errorf("advance shops id sequence: %w", err)
	}
	return id, nil
}

func get(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
