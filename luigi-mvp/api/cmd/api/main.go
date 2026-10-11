package main

import (
	"log"
	"net/http"

	"github.com/zigzagalex/luigi/api/internal/config"
	dbpool "github.com/zigzagalex/luigi/api/internal/db"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/router"
	"github.com/zigzagalex/luigi/api/internal/storage"
)

func main() {
	cfg := config.Load()

	sqlDB, err := dbpool.Open(cfg.DatabaseURL, dbpool.PoolConfig{
		MaxOpenConns:    cfg.MaxOpenConns,
		MaxIdleConns:    cfg.MaxIdleConns,
		ConnMaxIdle:     cfg.ConnMaxIdle,
		ConnMaxLifetime: cfg.ConnMaxLifetime,
	})
	if err != nil {
		log.Fatal(err)
	}
	defer sqlDB.Close()

	q := db.New(sqlDB)

	store, err := storage.NewS3Client(storage.S3Options{
		Endpoint:  cfg.S3Endpoint,
		Bucket:    cfg.S3Bucket,
		AccessKey: cfg.S3AccessKey,
		SecretKey: cfg.S3SecretKey,
		Region:    cfg.S3Region,
	})
	if err != nil {
		log.Fatalf("s3 client: %v", err)
	}

	r := router.New(router.Deps{
		Q:             q,
		Storage:       store,
		MediaBaseURL:  cfg.MediaBaseURL,
		SQLDB:         sqlDB,
		SessionSecret: cfg.SessionSecret,
		Env:           cfg.Env,
		CORSOrigins:   cfg.CORSOrigins,
	})

	log.Printf("s3 endpoint %s bucket %s", cfg.S3Endpoint, cfg.S3Bucket)
	log.Printf("CORS allowlist: %v", cfg.CORSOrigins)
	if cfg.ShopID > 0 {
		log.Printf("deploy shop id: %d", cfg.ShopID)
	}
	log.Printf("listening on :%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, r))
}
