package accessoryvariantsv1

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	accessoryvariantsvc "github.com/zigzagalex/luigi/api/internal/accessory_variants"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

func RegisterRoutes(r chi.Router, q db.Querier) {
	svc := accessoryvariantsvc.NewService(q)

	r.Route("/accessory_variants", func(r chi.Router) {
		r.Get("/", listHandler(svc))
		r.Get("/{variantID}", getByID(svc))
		r.Post("/", createHandler(svc))
		r.Put("/{variantID}", updateHandler(svc))
		r.Delete("/{variantID}", deleteHandler(svc))
	})
}

func listHandler(svc *accessoryvariantsvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

		var accessoryIDPtr *int64
		if s := strings.TrimSpace(r.URL.Query().Get("accessory_id")); s != "" {
			v, err := strconv.ParseInt(s, 10, 64)
			if err != nil || v <= 0 {
				httpx.Fail(w, http.StatusBadRequest, "invalid_accessory_id", nil)
				return
			}
			accessoryIDPtr = &v
		}

		items, err := svc.List(r.Context(), accessoryvariantsvc.ListInput{
			AccessoryID: accessoryIDPtr,
			Limit:       int32(limit),
			Offset:      int32(offset),
		})
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "list_accessory_variants_failed", err.Error())
			return
		}
		if items == nil {
			items = []db.AccessoryVariant{}
		}
		httpx.JSON(w, http.StatusOK, items)
	}
}

type createReq struct {
	AccessoryID int64           `json:"accessory_id"`
	Label       string          `json:"label"`
	Attributes  json.RawMessage `json:"attributes"`
	IsActive    *bool           `json:"is_active"`
}

func createHandler(svc *accessoryvariantsvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}

		if req.AccessoryID <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "accessory_id_required", nil)
			return
		}
		label := strings.TrimSpace(req.Label)
		if label == "" {
			httpx.Fail(w, http.StatusBadRequest, "label_required", nil)
			return
		}

		item, err := svc.Create(r.Context(), accessoryvariantsvc.CreateInput{
			AccessoryID: req.AccessoryID,
			Label:       label,
			Attributes:  req.Attributes,
			IsActive:    req.IsActive,
		})
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "create_accessory_variant_failed", err.Error())
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

func updateHandler(svc *accessoryvariantsvc.Service) http.HandlerFunc {
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

		item, err := svc.Update(r.Context(), accessoryvariantsvc.UpdateInput{
			ID:         id,
			Label:      u.TrimOrNil(req.Label),
			Attributes: req.Attributes,
			IsActive:   req.IsActive,
		})
		if err != nil {
			if err == accessoryvariantsvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "accessory_variant_not_found", nil)
				return
			}
			log.Printf("update_accessory_variant_failed id=%d: %v", id, err)
			httpx.Fail(w, http.StatusInternalServerError, "update_accessory_variant_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}

func deleteHandler(svc *accessoryvariantsvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(chi.URLParam(r, "variantID"), 10, 64)
		if err != nil || id <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_id", nil)
			return
		}

		item, err := svc.Delete(r.Context(), id)
		if err != nil {
			if err == accessoryvariantsvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "accessory_variant_not_found", nil)
				return
			}
			log.Printf("delete_accessory_variant_failed id=%d: %v", id, err)
			httpx.Fail(w, http.StatusInternalServerError, "delete_accessory_variant_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}

func getByID(svc *accessoryvariantsvc.Service) http.HandlerFunc {
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
			if errors.Is(err, accessoryvariantsvc.ErrNotFound) {
				httpx.Fail(w, http.StatusNotFound, "variant not found", map[string]any{
					"variant_id": id,
				})
				return
			}
			httpx.Fail(w, http.StatusInternalServerError, "failed to get variant", err.Error())
			return
		}

		httpx.JSON(w, http.StatusOK, v)
	}
}
