package productvariantsv1

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	variantsvc "github.com/zigzagalex/luigi/api/internal/product_variants"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

func RegisterRoutesPublic(r chi.Router, q db.Querier) {
	svc := variantsvc.NewService(q)

	r.Get("/product_variants", listHandler(svc))
	r.Get("/product_variants/", listHandler(svc))
	r.Get("/product_variants/{variantID}", GetByID(svc))
}

func RegisterRoutesPrivate(r chi.Router, q db.Querier) {
	svc := variantsvc.NewService(q)

	r.Post("/product_variants", createHandler(svc))
	r.Post("/product_variants/", createHandler(svc))
	r.Put("/product_variants/{variantID}", updateHandler(svc))
	r.Delete("/product_variants/{variantID}", deleteHandler(svc))
}

func listHandler(svc *variantsvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

		var productIDPtr *int64
		if s := strings.TrimSpace(r.URL.Query().Get("product_id")); s != "" {
			v, err := strconv.ParseInt(s, 10, 64)
			if err != nil || v <= 0 {
				httpx.Fail(w, http.StatusBadRequest, "invalid_product_id", nil)
				return
			}
			productIDPtr = &v
		}

		items, err := svc.List(r.Context(), variantsvc.ListInput{
			ProductID: productIDPtr,
			Limit:     int32(limit),
			Offset:    int32(offset),
		})
		if err != nil {
			httpx.ServerError(w, "list_product_variants_failed", err)
			return
		}
		if items == nil {
			items = []db.ProductVariant{}
		}
		httpx.JSON(w, http.StatusOK, items)
	}
}

type createReq struct {
	ProductID  int64           `json:"product_id"`
	Label      string          `json:"label"`
	Attributes json.RawMessage `json:"attributes"`
	IsActive   *bool           `json:"is_active"`
}

func createHandler(svc *variantsvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}

		if req.ProductID <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "product_id_required", nil)
			return
		}
		label := strings.TrimSpace(req.Label)
		if label == "" {
			httpx.Fail(w, http.StatusBadRequest, "label_required", nil)
			return
		}

		item, err := svc.Create(r.Context(), variantsvc.CreateInput{
			ProductID:  req.ProductID,
			Label:      label,
			Attributes: req.Attributes, // raw JSON passed through
			IsActive:   req.IsActive,
		})
		if err != nil {
			httpx.ServerError(w, "create_product_variant_failed", err)
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}

type updateReq struct {
	Label      *string          `json:"label"`
	Attributes *json.RawMessage `json:"attributes"`
	IsActive   *bool            `json:"is_active"`
}

func updateHandler(svc *variantsvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(chi.URLParam(r, "variantID"), 10, 64)
		if err != nil || id <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_id", nil)
			return
		}

		var req updateReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}

		item, err := svc.Update(r.Context(), variantsvc.UpdateInput{
			ID:         id,
			Label:      u.TrimOrNil(req.Label),
			Attributes: req.Attributes, // nil => leave as-is via COALESCE; non-nil => set
			IsActive:   req.IsActive,
		})
		if err != nil {
			if err == variantsvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "product_variant_not_found", nil)
				return
			}
			log.Printf("update_product_variant_failed id=%d: %v", id, err)
			httpx.ServerError(w, "update_product_variant_failed", err)
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}

func deleteHandler(svc *variantsvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(chi.URLParam(r, "variantID"), 10, 64)
		if err != nil || id <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_id", nil)
			return
		}

		item, err := svc.Delete(r.Context(), id)
		if err != nil {
			if err == variantsvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "product_variant_not_found", nil)
				return
			}
			log.Printf("delete_product_variant_failed id=%d: %v", id, err)
			httpx.ServerError(w, "delete_product_variant_failed", err)
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}

func GetByID(svc *variantsvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := chi.URLParam(r, "variantID")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil || id <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid variant id", map[string]any{
				"variant_id": idStr,
			})
			return
		}

		v, err := svc.GetByID(r.Context(), id)
		if err != nil {
			if errors.Is(err, variantsvc.ErrNotFound) {
				httpx.Fail(w, http.StatusNotFound, "variant not found", map[string]any{
					"variant_id": id,
				})
				return
			}
			httpx.ServerError(w, "get_variant_failed", err)
			return
		}

		httpx.JSON(w, http.StatusOK, v)
	}
}
