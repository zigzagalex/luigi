package productsv1

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	productsvc "github.com/zigzagalex/luigi/api/internal/products"
	"github.com/zigzagalex/luigi/api/internal/storage"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

func RegisterRoutes(r chi.Router, q db.Querier, store storage.Client, mediaBaseURL string) {
	svc := productsvc.NewService(q)

	// Debug route to prove this file is wired
	r.Get("/products/debug/ping", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		_, _ = w.Write([]byte("products ping OK"))
	})

	// All product routes under /v1/products
	r.Route("/products", func(r chi.Router) {
		// /v1/products
		r.Get("/", listHandler(svc, mediaBaseURL))
		r.Post("/", createHandler(svc))

		// /v1/products/{productID}
		r.Get("/{productID}", getHandler(svc))
		r.Put("/{productID}", updateHandler(svc))
		r.Delete("/{productID}", deleteHandler(svc))
	})
}

func listHandler(svc *productsvc.Service, mediaBaseURL string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

		// shop_id optional
		var shopIDPtr *int64
		if s := strings.TrimSpace(r.URL.Query().Get("shop_id")); s != "" {
			v, err := strconv.ParseInt(s, 10, 64)
			if err != nil {
				httpx.Fail(w, http.StatusBadRequest, "invalid_shop_id", err.Error())
				return
			}
			shopID := v
			shopIDPtr = &shopID
		}

		// ids optional (comma separated)
		ids, err := parseInt64CSV(r.URL.Query().Get("ids"))
		if err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_ids", err.Error())
			return
		}

		items, err := svc.ListWithPrimaryImageDTO(
			r.Context(),
			productsvc.ListWithImageInput{
				ShopID: shopIDPtr,
				Ids:    ids,
				Limit:  int32(limit),
				Offset: int32(offset),
			},
			mediaBaseURL,
		)
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "list_products_failed", err.Error())
			return
		}
		if items == nil {
			items = []productsvc.ProductDTO{}
		}

		httpx.JSON(w, http.StatusOK, items)
	}
}

func getHandler(svc *productsvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(chi.URLParam(r, "productID"), 10, 64)
		if err != nil || id <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_id", nil)
			return
		}

		dto, err := svc.GetDTO(r.Context(), id)
		if err != nil {
			if err == productsvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "product_not_found", nil)
				return
			}
			log.Printf("get_product_failed id=%d: %v", id, err)
			httpx.Fail(w, http.StatusInternalServerError, "get_product_failed", err.Error())
			return
		}

		httpx.JSON(w, http.StatusOK, dto)
	}
}

type createReq struct {
	ShopID        int64   `json:"shop_id"`
	SKU           *string `json:"sku"`
	Name          string  `json:"name"`
	Description   *string `json:"description"`
	PriceCategory string  `json:"price_category"`
	IsActive      *bool   `json:"is_active"`
}

func createHandler(svc *productsvc.Service) http.HandlerFunc {
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
		name := strings.TrimSpace(req.Name)
		if name == "" {
			httpx.Fail(w, http.StatusBadRequest, "name_required", nil)
			return
		}
		priceCat := strings.TrimSpace(req.PriceCategory)
		if priceCat == "" {
			httpx.Fail(w, http.StatusBadRequest, "price_category_required", nil)
			return
		}

		item, err := svc.Create(r.Context(), productsvc.CreateInput{
			ShopID:        req.ShopID,
			SKU:           u.TrimOrNil(req.SKU),
			Name:          name,
			Description:   u.TrimOrNil(req.Description),
			PriceCategory: priceCat,
			IsActive:      req.IsActive,
		})
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "create_product_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}

type updateReq struct {
	SKU           *string `json:"sku"`
	Name          *string `json:"name"`
	Description   *string `json:"description"`
	PriceCategory *string `json:"price_category"`
	IsActive      *bool   `json:"is_active"`
}

func updateHandler(svc *productsvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(chi.URLParam(r, "productID"), 10, 64)
		if err != nil || id <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_id", nil)
			return
		}

		var req updateReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}

		item, err := svc.Update(r.Context(), productsvc.UpdateInput{
			ID:            id,
			SKU:           u.TrimOrNil(req.SKU),
			Name:          u.TrimOrNil(req.Name),
			Description:   u.TrimOrNil(req.Description),
			PriceCategory: u.TrimOrNil(req.PriceCategory),
			IsActive:      req.IsActive,
		})
		if err != nil {
			if err == productsvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "product_not_found", nil)
				return
			}
			log.Printf("update_product_failed id=%d: %v", id, err)
			httpx.Fail(w, http.StatusInternalServerError, "update_product_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}

func deleteHandler(svc *productsvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(chi.URLParam(r, "productID"), 10, 64)
		if err != nil || id <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_id", nil)
			return
		}

		item, err := svc.Delete(r.Context(), id)
		if err != nil {
			if err == productsvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "product_not_found", nil)
				return
			}
			log.Printf("delete_product_failed id=%d: %v", id, err)
			httpx.Fail(w, http.StatusInternalServerError, "delete_product_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}

func parseInt64CSV(s string) ([]int64, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil, nil // IMPORTANT: nil => SQL NULL => disables filter
	}

	parts := strings.Split(s, ",")
	out := make([]int64, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		id, err := strconv.ParseInt(p, 10, 64)
		if err != nil {
			return nil, err
		}
		out = append(out, id)
	}

	// If user provided ids but all were empty/invalid, choose:
	// - nil (treat like no filter) OR
	// - error (stricter). I recommend error.
	if len(out) == 0 {
		return nil, nil
	}

	return out, nil
}
