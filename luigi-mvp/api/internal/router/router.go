package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chiMw "github.com/go-chi/chi/v5/middleware"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/middleware"
	"github.com/zigzagalex/luigi/api/internal/storage"

	v1customers "github.com/zigzagalex/luigi/api/internal/v1/customers"
	v1inventory "github.com/zigzagalex/luigi/api/internal/v1/inventory"
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
	r.Use(middleware.SecurityHeaders, middleware.RequestLogger, apiVersionHeader("1")) // default header for v1 routes
	r.Use(chiMw.Recoverer)
	r.Route("/v1", func(r chi.Router) {
		v1shops.RegisterRoutes(r, d.Q)
		v1stores.RegisterRoutes(r, d.Q)
		v1users.RegisterRoutes(r, d.Q)
		v1customers.RegisterRoutes(r, d.Q)
		v1products.RegisterRoutes(r, d.Q, d.Storage, d.MediaBaseURL)
		v1product_variants.RegisterRoutes(r, d.Q)
		v1inventory.RegisterRoutes(r, d.Q)

		v1productvariantimages.RegisterRoutes(r, d.Q, d.Storage, d.MediaBaseURL)
	})
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
