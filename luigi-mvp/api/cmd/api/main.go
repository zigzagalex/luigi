package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func env(k string) string {
	v := os.Getenv(k)
	if v == "" {
		log.Fatalf("missing env %s", k)
	}
	return v
}

func main() {
	inst := env("DB_INSTANCE")
	user := env("DB_USER")
	pass := env("DB_PASSWORD")
	name := env("DB_NAME")

	dsn := fmt.Sprintf(
		"host=/cloudsql/%s user=%s password=%s dbname=%s sslmode=disable",
		inst, user, pass, name,
	)
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	db.SetMaxOpenConns(5)
	db.SetConnMaxIdleTime(5 * time.Minute)

	r := chi.NewRouter()

	// Root for testing
	r.NotFound(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "chi 404", http.StatusNotFound)
	})

	r.Get("/", func(w http.ResponseWriter, _ *http.Request) { 
    w.Write([]byte("ok")) 
  })
	r.Get("/readyz", func(w http.ResponseWriter, _ *http.Request) { 
    w.Write([]byte("ok")) 
  })

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	r.Get("/v1/products", func(w http.ResponseWriter, req *http.Request) {
		rows, err := db.QueryContext(req.Context(),
			`SELECT id, name FROM products ORDER BY id`)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type product struct {
			ID   int    `json:"id"`
			Name string `json:"name"`
		}
		var out []product
		for rows.Next() {
			var p product
			if err := rows.Scan(&p.ID, &p.Name); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			out = append(out, p)
		}
		if err := rows.Err(); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(out)
	})

	// Auf $PORT hören (Cloud Run setzt das zur Laufzeit)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
	log.Printf("listening on :%s", port)
	log.Fatal(srv.ListenAndServe())
}
