package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chiMw "github.com/go-chi/chi/v5/middleware"
	"github.com/zigzagalex/luigi/api/internal/middleware"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	
	v1shops "github.com/zigzagalex/luigi/api/internal/v1/shops"

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