package shopsv1

import (
	"encoding/json"
	"net/http"
	"strconv"

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

		item, err := svc.List(r.Context(), shopsvc.ListInput{
			Limit:  int32(limit),
			Offset: int32(offset),
		})
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "lists_shops_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusCreated, item)
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
		httpx.JSON(w, http.StatusCreated, item)
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
			Name:     req.Name,
			Timezone: req.Timezone,
			IsActive: req.IsActive,
		})
		if err != nil {
			if err == shopsvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "shop_not_found", nil)
			} else {
				httpx.Fail(w, http.StatusInternalServerError, "update_shop_failed", err.Error())
			}
			return
		}
		httpx.JSON(w, http.StatusOK, item)

	}
}
