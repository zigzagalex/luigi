package pricepointsv1

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	pricepoints "github.com/zigzagalex/luigi/api/internal/price_points"
)

func RegisterRoutesPublic(r chi.Router, q db.Querier) {
	svc := pricepoints.NewService(q)

	r.Get("/price_points", listHandler(svc))
	r.Get("/price_points/", listHandler(svc))
	r.Get("/price_points/{priceCategory}/{dayCount}", getHandler(svc))
}

func RegisterRoutesPrivate(r chi.Router, q db.Querier) {
	svc := pricepoints.NewService(q)

	r.Put("/price_points/{priceCategory}/{dayCount}", upsertHandler(svc))
	r.Delete("/price_points/{priceCategory}/{dayCount}", deleteHandler(svc))
}

func listHandler(svc *pricepoints.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rawCat := strings.TrimSpace(r.URL.Query().Get("price_category"))

		var categoryPtr *string
		if rawCat != "" {
			categoryPtr = &rawCat
		}

		items, err := svc.List(r.Context(), categoryPtr)
		if err != nil {
			log.Printf("list_price_points_failed: %v", err)
			httpx.Fail(w, http.StatusInternalServerError, "list_price_points_failed", err.Error())
			return
		}

		httpx.JSON(w, http.StatusOK, items)
	}
}

func getHandler(svc *pricepoints.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		priceCategory := strings.TrimSpace(chi.URLParam(r, "priceCategory"))
		dayCountStr := chi.URLParam(r, "dayCount")

		if priceCategory == "" {
			httpx.Fail(w, http.StatusBadRequest, "price_category_required", nil)
			return
		}

		dayCount64, err := strconv.ParseInt(dayCountStr, 10, 32)
		if err != nil || dayCount64 <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_day_count", map[string]any{
				"day_count": dayCountStr,
			})
			return
		}

		item, err := svc.Get(r.Context(), priceCategory, int32(dayCount64))
		if err != nil {
			if err == pricepoints.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "price_point_not_found", map[string]any{
					"price_category": priceCategory,
					"day_count":      dayCount64,
				})
				return
			}
			log.Printf("get_price_point_failed: %v", err)
			httpx.Fail(w, http.StatusInternalServerError, "get_price_point_failed", err.Error())
			return
		}

		httpx.JSON(w, http.StatusOK, item)
	}
}

type upsertReq struct {
	PriceTotalCents *int32 `json:"price_total_cents"`
}

func upsertHandler(svc *pricepoints.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		priceCategory := strings.TrimSpace(chi.URLParam(r, "priceCategory"))
		dayCountStr := chi.URLParam(r, "dayCount")

		if priceCategory == "" {
			httpx.Fail(w, http.StatusBadRequest, "price_category_required", nil)
			return
		}

		dayCount64, err := strconv.ParseInt(dayCountStr, 10, 32)
		if err != nil || dayCount64 <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_day_count", map[string]any{
				"day_count": dayCountStr,
			})
			return
		}

		var body upsertReq
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}
		if body.PriceTotalCents == nil || *body.PriceTotalCents < 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_price_total_cents", nil)
			return
		}

		item, err := svc.Upsert(r.Context(), pricepoints.UpsertInput{
			PriceCategory:   priceCategory,
			DayCount:        int32(dayCount64),
			PriceTotalCents: *body.PriceTotalCents,
		})
		if err != nil {
			log.Printf("upsert_price_point_failed: %v", err)
			httpx.Fail(w, http.StatusInternalServerError, "upsert_price_point_failed", err.Error())
			return
		}

		httpx.JSON(w, http.StatusOK, item)
	}
}

func deleteHandler(svc *pricepoints.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		priceCategory := strings.TrimSpace(chi.URLParam(r, "priceCategory"))
		dayCountStr := chi.URLParam(r, "dayCount")

		if priceCategory == "" {
			httpx.Fail(w, http.StatusBadRequest, "price_category_required", nil)
			return
		}

		dayCount64, err := strconv.ParseInt(dayCountStr, 10, 32)
		if err != nil || dayCount64 <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_day_count", map[string]any{
				"day_count": dayCountStr,
			})
			return
		}

		err = svc.Delete(r.Context(), priceCategory, int32(dayCount64))
		if err != nil {
			if err == pricepoints.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "price_point_not_found", map[string]any{
					"price_category": priceCategory,
					"day_count":      dayCount64,
				})
				return
			}
			log.Printf("delete_price_point_failed: %v", err)
			httpx.Fail(w, http.StatusInternalServerError, "delete_price_point_failed", err.Error())
			return
		}

		httpx.JSON(w, http.StatusNoContent, nil)
	}
}
