package inventoryv1

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	inventorysvc "github.com/zigzagalex/luigi/api/internal/inventory"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

func RegisterRoutesPublic(r chi.Router, q db.Querier) {
	svc := inventorysvc.NewService(q)

	r.Route("/inventory_items", func(r chi.Router) {
		r.Get("/", listHandler(svc)) // GET /inventory_items?shop_id=&limit=&offset=
	})
}

func RegisterRoutesPrivate(r chi.Router, q db.Querier) {
	svc := inventorysvc.NewService(q)

	r.Route("/inventory_items", func(r chi.Router) {
		r.Post("/", createHandler(svc))           // POST /inventory_items
		r.Put("/{itemID}", updateHandler(svc))    // PUT /inventory_items/{itemID}
		r.Delete("/{itemID}", deleteHandler(svc)) // DELETE /inventory_items/{itemID}
	})
}

func listHandler(svc *inventorysvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

		var shopIDPtr *int64
		if s := strings.TrimSpace(r.URL.Query().Get("shop_id")); s != "" {
			v, err := strconv.ParseInt(s, 10, 64)
			if err != nil || v <= 0 {
				httpx.Fail(w, http.StatusBadRequest, "invalid_shop_id", nil)
				return
			}
			shopIDPtr = &v
		}

		items, err := svc.List(r.Context(), inventorysvc.ListInput{
			ShopID: shopIDPtr,
			Limit:  int32(limit),
			Offset: int32(offset),
		})
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "list_inventory_items_failed", err.Error())
			return
		}
		if items == nil {
			items = []db.InventoryItem{}
		}
		httpx.JSON(w, http.StatusOK, items)
	}
}

type createReq struct {
	ShopID           int64   `json:"shop_id"`
	ProductVariantID int64   `json:"product_variant_id"`
	StoreID          int64   `json:"store_id"`
	TagCode          *string `json:"tag_code"`
	SerialNumber     *string `json:"serial_number"`
	Status           *string `json:"status"`                 // "active" | "inactive" | "retired"
	ServiceBefore    *string `json:"service_padding_before"` // e.g. "15 minutes", "00:15:00"
	ServiceAfter     *string `json:"service_padding_after"`
	IsActive         *bool   `json:"is_active"`
}

func createHandler(svc *inventorysvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}

		if req.ShopID <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "shop_id_required", nil)
			return
		}
		if req.ProductVariantID <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "product_variant_id_required", nil)
			return
		}
		if req.StoreID <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "store_id_required", nil)
			return
		}
		if req.Status != nil {
			s := strings.TrimSpace(*req.Status)
			if s != "active" && s != "inactive" && s != "retired" {
				httpx.Fail(w, http.StatusBadRequest, "invalid_status", "status must be one of 'active','inactive','retired'")
				return
			}
		}

		item, err := svc.Create(r.Context(), inventorysvc.CreateInput{
			ShopID:           req.ShopID,
			ProductVariantID: req.ProductVariantID,
			StoreID:          req.StoreID,
			TagCode:          u.TrimOrNil(req.TagCode),
			SerialNumber:     u.TrimOrNil(req.SerialNumber),
			Status:           u.TrimOrNil(req.Status),
			ServiceBefore:    u.TrimOrNil(req.ServiceBefore),
			ServiceAfter:     u.TrimOrNil(req.ServiceAfter),
			IsActive:         req.IsActive,
		})
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "create_inventory_item_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}

type updateReq struct {
	TagCode       *string `json:"tag_code"`
	SerialNumber  *string `json:"serial_number"`
	Status        *string `json:"status"`
	ServiceBefore *string `json:"service_padding_before"`
	ServiceAfter  *string `json:"service_padding_after"`
	IsActive      *bool   `json:"is_active"`
}

func updateHandler(svc *inventorysvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(chi.URLParam(r, "itemID"), 10, 64)
		if err != nil || id <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_id", nil)
			return
		}

		var req updateReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}

		if req.Status != nil {
			s := strings.TrimSpace(*req.Status)
			if s != "active" && s != "inactive" && s != "retired" {
				httpx.Fail(w, http.StatusBadRequest, "invalid_status", "status must be one of 'active','inactive','retired'")
				return
			}
		}

		item, err := svc.Update(r.Context(), inventorysvc.UpdateInput{
			ID:            id,
			TagCode:       u.TrimOrNil(req.TagCode),
			SerialNumber:  u.TrimOrNil(req.SerialNumber),
			Status:        u.TrimOrNil(req.Status),
			ServiceBefore: u.TrimOrNil(req.ServiceBefore),
			ServiceAfter:  u.TrimOrNil(req.ServiceAfter),
			IsActive:      req.IsActive,
		})
		if err != nil {
			if err == inventorysvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "inventory_item_not_found", nil)
				return
			}
			log.Printf("update_inventory_item_failed id=%d: %v", id, err)
			httpx.Fail(w, http.StatusInternalServerError, "update_inventory_item_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}

func deleteHandler(svc *inventorysvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(chi.URLParam(r, "itemID"), 10, 64)
		if err != nil || id <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_id", nil)
			return
		}

		item, err := svc.Delete(r.Context(), id)
		if err != nil {
			if err == inventorysvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "inventory_item_not_found", nil)
				return
			}
			log.Printf("delete_inventory_item_failed id=%d: %v", id, err)
			httpx.Fail(w, http.StatusInternalServerError, "delete_inventory_item_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}
