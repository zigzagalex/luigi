package shopsv1

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	shopsvc "github.com/zigzagalex/luigi/api/internal/shops"
)

func RegisterRoutes(r chi.Router, q db.Querier) {
	svc := shopsvc.NewService(q)

	r.Route("/shops", func(r chi.Router) {
		r.Get("/", listHandler(svc))
		r.Post("/", createHandler(svc))
		r.Put("/{shopID}", updateHandler(svc))
	})
}

func listHandler(svc *shopsvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

		items, err := svc.List(r.Context(), shopsvc.ListInput{
			Limit:  int32(limit),
			Offset: int32(offset),
		})
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "lists_shops_failed", err.Error())
			return
		}
		if items == nil {
			items = []db.Shop{}
		}
		httpx.JSON(w, http.StatusOK, items)
	}
}

type createReq struct {
	Name     string  `json:"name"`
	Timezone *string `json:"timezone"`
	IsActive *bool   `json:"is_active"`
}

func createHandler(svc *shopsvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}
		if req.Name == "" {
			httpx.Fail(w, http.StatusBadRequest, "name_required", nil)
			return
		}

		item, err := svc.Create(r.Context(), shopsvc.CreateInput{
			Name:     req.Name,
			Timezone: req.Timezone,
			IsActive: req.IsActive,
		})
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "create_shop_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}

type updateReq struct {
	Name     *string `json:"name"`
	Timezone *string `json:"timezone"`
	IsActive *bool   `json:"is_active"`
}

func updateHandler(svc *shopsvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(chi.URLParam(r, "shopID"), 10, 64)
		if err != nil || id <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_id", nil)
			return
		}

		var req updateReq
		err = json.NewDecoder(r.Body).Decode(&req)
		if err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}

		item, err := svc.Update(r.Context(), shopsvc.UpdateInput{
			ID:       id,
			Name:     trimOrNil(req.Name),
			Timezone: trimOrNil(req.Timezone),
			IsActive: req.IsActive,
		})
		if err != nil {
			// TEMP: log + raw error response so we see what's going on
			// (keep your 404 mapping for ErrNotFound)
			if err == shopsvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "shop_not_found", nil)
				return
			}
			// Log to stderr so it shows in Cloud Run logs
			// import "log" at top
			log.Printf("update_shop_failed id=%d: %v", id, err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(`{"error":"update_shop_failed","details":"` + strings.ReplaceAll(err.Error(), `"`, `\"`) + `"}`))
			return
		}
		httpx.JSON(w, http.StatusOK, item)

	}
}

func trimOrNil(p *string) *string {
	if p == nil {
		return nil
	}
	s := strings.TrimSpace(*p)
	if s == "" {
		return nil
	}
	return &s
}
