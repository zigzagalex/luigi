package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chiMw "github.com/go-chi/chi/v5/middleware"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/middleware"

	v1customers "github.com/zigzagalex/luigi/api/internal/v1/customers"
	v1products "github.com/zigzagalex/luigi/api/internal/v1/products"
	v1shops "github.com/zigzagalex/luigi/api/internal/v1/shops"
	v1stores "github.com/zigzagalex/luigi/api/internal/v1/stores"
	v1users "github.com/zigzagalex/luigi/api/internal/v1/users"
)

type Deps struct {
	Q db.Querier
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
		v1products.RegisterRoutes(r, d.Q)
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
