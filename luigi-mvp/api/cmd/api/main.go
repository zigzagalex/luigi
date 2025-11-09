package main

import (
	"log"
	"net/http"

	"github.com/zigzagalex/luigi/api/internal/config"
	dbpool "github.com/zigzagalex/luigi/api/internal/db"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/router"
)

func main() {
	cfg := config.Load()

	sqlDB, err := dbpool.Open(cfg.DatabaseURL, dbpool.PoolConfig{
		MaxOpenConns: cfg.MaxOpenConns, MaxIdleConns: cfg.MaxIdleConns,
		ConnMaxIdle: cfg.ConnMaxIdle, ConnMaxLifetime: cfg.ConnMaxLifetime,
	})
	if err != nil {
		log.Fatal(err)
	}
	defer sqlDB.Close()

	q := db.New(sqlDB)
	r := router.New(router.Deps{Q: q})

	log.Printf("listening on :%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, r))
}
