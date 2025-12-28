package router

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	chiMw "github.com/go-chi/chi/v5/middleware"
	"github.com/rs/cors"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/middleware"
	"github.com/zigzagalex/luigi/api/internal/storage"

	v1availability "github.com/zigzagalex/luigi/api/internal/v1/availability"
	v1categories "github.com/zigzagalex/luigi/api/internal/v1/categories"
	v1customers "github.com/zigzagalex/luigi/api/internal/v1/customers"
	v1inventory "github.com/zigzagalex/luigi/api/internal/v1/inventory"
	v1pricepoints "github.com/zigzagalex/luigi/api/internal/v1/price_points"
	v1productvariantimages "github.com/zigzagalex/luigi/api/internal/v1/product_variant_images"
	v1product_variants "github.com/zigzagalex/luigi/api/internal/v1/product_variants"
	v1products "github.com/zigzagalex/luigi/api/internal/v1/products"
	v1shops "github.com/zigzagalex/luigi/api/internal/v1/shops"
	v1stores "github.com/zigzagalex/luigi/api/internal/v1/stores"
	v1users "github.com/zigzagalex/luigi/api/internal/v1/users"
)

type Deps struct {
	Q            *db.Queries
	Storage      storage.Client
	MediaBaseURL string
}

func New(d Deps) http.Handler {
	r := chi.NewRouter()
	c := cors.New(cors.Options{
		AllowedOrigins: []string{
			"http://localhost:3000",
		},
		AllowedMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
		// Only set AllowCredentials=true if you actually use cookies.
		AllowCredentials: false,
		MaxAge:           300,
	})

	r.Use(c.Handler)
	r.Use(middleware.SecurityHeaders, middleware.RequestLogger, apiVersionHeader("1")) // default header for v1 routes
	r.Use(chiMw.Recoverer)
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	r.Route("/v1", func(r chi.Router) {
		v1shops.RegisterRoutes(r, d.Q)
		v1stores.RegisterRoutes(r, d.Q)
		v1users.RegisterRoutes(r, d.Q)
		v1customers.RegisterRoutes(r, d.Q)
		v1products.RegisterRoutes(r, d.Q, d.Storage, d.MediaBaseURL)
		v1product_variants.RegisterRoutes(r, d.Q)
		v1inventory.RegisterRoutes(r, d.Q)
		v1categories.RegisterRoutes(r, d.Q)
		v1pricepoints.RegisterRoutes(r, d.Q)
		v1availability.RegisterRoutes(r, d.Q)

		v1productvariantimages.RegisterRoutes(r, d.Q, d.Storage, d.MediaBaseURL)
		r.NotFound(func(w http.ResponseWriter, r *http.Request) {
			// this log will tell us if the router failed to match
			log.Printf("[V1 NOT FOUND] %s %s", r.Method, r.URL.Path)
			http.Error(w, "v1 not found: "+r.URL.Path, http.StatusNotFound)
		})
	})

	if err := chi.Walk(r, func(method, route string, handler http.Handler,
		middlewares ...func(http.Handler) http.Handler) error {

		log.Printf("[ROUTE] %s %s", method, route)
		return nil
	}); err != nil {
		log.Printf("chi.Walk error: %v", err)
	}

	return r
}

// Helper function to stamp api version on responses
func apiVersionHeader(ver string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("API-Version", ver)
			next.ServeHTTP(w, r)
		})
	}
}
