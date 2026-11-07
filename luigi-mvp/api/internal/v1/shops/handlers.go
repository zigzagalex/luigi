package shopsv1

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	shopsvc "github.com/zigzagalex/luigi/api/internal/shops"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

func RegisterRoutesPublic(r chi.Router, q db.Querier) {
	svc := shopsvc.NewService(q)
	// Method routes (not Route/Mount) so public + private can share the /shops prefix.
	r.Get("/shops", listHandler(svc))
	r.Get("/shops/", listHandler(svc))
}

func RegisterRoutesPrivate(r chi.Router, q db.Querier) {
	svc := shopsvc.NewService(q)
	r.Post("/shops", createHandler(svc))
	r.Post("/shops/", createHandler(svc))
	r.Put("/shops/{shopID}", updateHandler(svc))
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
			httpx.ServerError(w, "lists_shops_failed", err)
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
			httpx.ServerError(w, "create_shop_failed", err)
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
			Name:     u.TrimOrNil(req.Name),
			Timezone: u.TrimOrNil(req.Timezone),
			IsActive: req.IsActive,
		})
		if err != nil {
			if err == shopsvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "shop_not_found", nil)
				return
			}
			httpx.ServerError(w, "update_shop_failed", err)
			return
		}
		httpx.JSON(w, http.StatusOK, item)

	}
}
