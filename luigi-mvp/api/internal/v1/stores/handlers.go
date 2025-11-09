package storesv1

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	storesvc "github.com/zigzagalex/luigi/api/internal/stores"
)

func RegisterRoutes(r chi.Router, q db.Querier) {
	svc := storesvc.NewService(q)
	r.Route("/stores", func(r chi.Router) {
		r.Get("/", listHandler(svc)) // optional ?shop_id=, ?limit=, ?offset=
		r.Post("/", createHandler(svc))
		r.Put("/{storeID}", updateHandler(svc))
	})
}

func listHandler(svc *storesvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

		var shopIDPtr *int64
		if s := r.URL.Query().Get("shop_id"); s != "" {
			if id, err := strconv.ParseInt(s, 10, 64); err == nil && id > 0 {
				shopIDPtr = &id
			}
		}

		items, err := svc.List(r.Context(), storesvc.ListInput{
			ShopID: shopIDPtr,
			Limit:  int32(limit),
			Offset: int32(offset),
		})
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "list_stores_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, items)
	}
}

type createReq struct {
	ShopID     int64   `json:"shop_id"`
	Name       string  `json:"name"`
	Address1   *string `json:"address1"`
	Address2   *string `json:"address2"`
	PostalCode *string `json:"postal_code"`
	City       *string `json:"city"`
	Country    *string `json:"country"`
	Timezone   *string `json:"timezone"`
	IsActive   *bool   `json:"is_active"`
}

func createHandler(svc *storesvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}
		if req.ShopID <= 0 || req.Name == "" {
			httpx.Fail(w, http.StatusBadRequest, "shop_id_and_name_required", nil)
			return
		}

		item, err := svc.Create(r.Context(), storesvc.CreateInput{
			ShopID:     req.ShopID,
			Name:       req.Name,
			Address1:   req.Address1,
			Address2:   req.Address2,
			PostalCode: req.PostalCode,
			City:       req.City,
			Country:    req.Country,
			Timezone:   req.Timezone,
			IsActive:   req.IsActive,
		})
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "create_store_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusCreated, item)
	}
}

type updateReq struct {
	Name       *string `json:"name"`
	Address1   *string `json:"address1"`
	Address2   *string `json:"address2"`
	PostalCode *string `json:"postal_code"`
	City       *string `json:"city"`
	Country    *string `json:"country"`
	Timezone   *string `json:"timezone"`
	IsActive   *bool   `json:"is_active"`
}

func updateHandler(svc *storesvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(chi.URLParam(r, "storeID"), 10, 64)
		if err != nil || id <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_id", nil)
			return
		}
		var req updateReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}

		item, err := svc.Update(r.Context(), storesvc.UpdateInput{
			ID:         id,
			Name:       req.Name,
			Address1:   req.Address1,
			Address2:   req.Address2,
			PostalCode: req.PostalCode,
			City:       req.City,
			Country:    req.Country,
			Timezone:   req.Timezone,
			IsActive:   req.IsActive,
		})
		if err != nil {
			if err == storesvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "store_not_found", nil)
			} else {
				httpx.Fail(w, http.StatusInternalServerError, "update_store_failed", err.Error())
			}
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}
