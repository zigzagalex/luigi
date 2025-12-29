package main

import (
	"context"
	"log"
	"net/http"

	"github.com/zigzagalex/luigi/api/internal/auth"
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

	ctx := context.Background()

	var store storage.Client

	if cfg.Env == "dev" {
		// Local dev: no GCP, just a noop client
		store = storage.NewNoopClient()
	} else {
		// Prod/staging: GCS.
		gcsClient, err := storage.NewGCSClient(ctx, cfg.GCSBucketName)
		if err != nil {
			log.Fatalf("failed to init GCS client: %v", err)
		}
		store = gcsClient
	}

	// Firebase Admin 
	fbAuth, err := auth.NewFirebaseAuthClient(ctx)
	if err != nil {
		log.Fatalf("failed to init firebase auth: %v", err)
	}

	r := router.New(router.Deps{
		Q:            q,
		Storage:      store,
		MediaBaseURL: cfg.MediaBaseURL,
		FirebaseAuth: fbAuth, 
		Env:          cfg.Env,
	})

	log.Printf("listening on :%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, r))
}
