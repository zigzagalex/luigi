package categoriesv1

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	categoriessvc "github.com/zigzagalex/luigi/api/internal/categories"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

func RegisterRoutesPublic(r chi.Router, q db.Querier) {
	svc := categoriessvc.NewService(q)

	r.Route("/categories", func(r chi.Router) {
		r.Get("/", listHandler(svc))     // GET  /categories?shop_id=
		r.Get("/tree", treeHandler(svc)) // GET  /categories/tree?shop_id=
	})

	r.Get("/products/{productID}/categories", listProductCategoriesHandler(svc)) // GET /products/{productID}/categories
}

func RegisterRoutesPrivate(r chi.Router, q db.Querier) {
	svc := categoriessvc.NewService(q)

	r.Route("/categories", func(r chi.Router) {
		r.Post("/", createHandler(svc))               // POST /categories
		r.Put("/{categoryID}", updateHandler(svc))    // PUT  /categories/{categoryID}
		r.Delete("/{categoryID}", deleteHandler(svc)) // DELETE /categories/{categoryID}
	})

	r.Put("/products/{productID}/categories", replaceProductCategoriesHandler(svc)) // PUT /products/{productID}/categories
}

func parseIDParam(r *http.Request, name string) (int64, bool) {
	raw := chi.URLParam(r, name)
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || id <= 0 {
		return 0, false
	}
	return id, true
}

func parseShopIDQuery(r *http.Request) (int64, bool) {
	s := strings.TrimSpace(r.URL.Query().Get("shop_id"))
	if s == "" {
		return 0, false
	}
	v, err := strconv.ParseInt(s, 10, 64)
	if err != nil || v <= 0 {
		return 0, false
	}
	return v, true
}

func listHandler(svc *categoriessvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		shopID, ok := parseShopIDQuery(r)
		if !ok {
			httpx.Fail(w, http.StatusBadRequest, "invalid_shop_id", nil)
			return
		}

		items, err := svc.ListCategories(r.Context(), shopID)
		if err != nil {
			log.Printf("list_categories_failed shop_id=%d: %v", shopID, err)
			httpx.Fail(w, http.StatusInternalServerError, "list_categories_failed", err.Error())
			return
		}
		if items == nil {
			items = []categoriessvc.CategoryDTO{}
		}
		httpx.JSON(w, http.StatusOK, items)
	}
}

func treeHandler(svc *categoriessvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		shopID, ok := parseShopIDQuery(r)
		if !ok {
			httpx.Fail(w, http.StatusBadRequest, "invalid_shop_id", nil)
			return
		}

		tree, err := svc.ListCategoryTree(r.Context(), shopID)
		if err != nil {
			log.Printf("list_category_tree_failed shop_id=%d: %v", shopID, err)
			httpx.Fail(w, http.StatusInternalServerError, "list_category_tree_failed", err.Error())
			return
		}
		if tree == nil {
			tree = []*categoriessvc.CategoryDTO{}
		}
		httpx.JSON(w, http.StatusOK, tree)
	}
}

type createReq struct {
	ShopID      int64   `json:"shop_id"`
	ParentID    *int64  `json:"parent_id"`
	Slug        string  `json:"slug"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	SortOrder   *int32  `json:"sort_order"`
	IsActive    *bool   `json:"is_active"`
}

func createHandler(svc *categoriessvc.Service) http.HandlerFunc {
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

		slug := strings.TrimSpace(req.Slug)
		name := strings.TrimSpace(req.Name)
		if slug == "" {
			httpx.Fail(w, http.StatusBadRequest, "slug_required", nil)
			return
		}
		if name == "" {
			httpx.Fail(w, http.StatusBadRequest, "name_required", nil)
			return
		}

		item, err := svc.CreateCategory(r.Context(), categoriessvc.CreateCategoryInput{
			ShopID:      req.ShopID,
			ParentID:    req.ParentID,
			Slug:        slug,
			Name:        name,
			Description: u.TrimOrNil(req.Description),
			SortOrder:   req.SortOrder,
			IsActive:    req.IsActive,
		})
		if err != nil {
			log.Printf("create_category_failed shop_id=%d slug=%s: %v", req.ShopID, slug, err)
			httpx.Fail(w, http.StatusInternalServerError, "create_category_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}

type updateReq struct {
	ParentID    *int64  `json:"parent_id"`
	Slug        *string `json:"slug"`
	Name        *string `json:"name"`
	Description *string `json:"description"`
	SortOrder   *int32  `json:"sort_order"`
	IsActive    *bool   `json:"is_active"`
}

func updateHandler(svc *categoriessvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := parseIDParam(r, "categoryID")
		if !ok {
			httpx.Fail(w, http.StatusBadRequest, "invalid_id", nil)
			return
		}

		var req updateReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}

		// Trim string fields if present
		var slug *string
		if req.Slug != nil {
			s := strings.TrimSpace(*req.Slug)
			slug = &s
		}
		var name *string
		if req.Name != nil {
			n := strings.TrimSpace(*req.Name)
			name = &n
		}

		item, err := svc.UpdateCategory(r.Context(), id, categoriessvc.UpdateCategoryInput{
			ParentID:    req.ParentID,
			Slug:        slug,
			Name:        name,
			Description: u.TrimOrNil(req.Description),
			SortOrder:   req.SortOrder,
			IsActive:    req.IsActive,
		})
		if err != nil {
			if err == categoriessvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "category_not_found", nil)
				return
			}
			log.Printf("update_category_failed id=%d: %v", id, err)
			httpx.Fail(w, http.StatusInternalServerError, "update_category_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}

func deleteHandler(svc *categoriessvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := parseIDParam(r, "categoryID")
		if !ok {
			httpx.Fail(w, http.StatusBadRequest, "invalid_id", nil)
			return
		}

		err := svc.DeleteCategory(r.Context(), id)
		if err != nil {
			if err == categoriessvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "category_not_found", nil)
				return
			}
			log.Printf("delete_category_failed id=%d: %v", id, err)
			httpx.Fail(w, http.StatusInternalServerError, "delete_category_failed", err.Error())
			return
		}
		// Consistent with most REST APIs: 204 No Content for delete
		w.WriteHeader(http.StatusNoContent)
	}
}

type replaceProductCategoriesReq struct {
	CategoryIDs []int64 `json:"category_ids"`
}

func replaceProductCategoriesHandler(svc *categoriessvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		productID, ok := parseIDParam(r, "productID")
		if !ok {
			httpx.Fail(w, http.StatusBadRequest, "invalid_product_id", nil)
			return
		}

		var req replaceProductCategoriesReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}

		if err := svc.ReplaceProductCategories(r.Context(), productID, req.CategoryIDs); err != nil {
			log.Printf("replace_product_categories_failed product_id=%d: %v", productID, err)
			httpx.Fail(w, http.StatusInternalServerError, "replace_product_categories_failed", err.Error())
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

func listProductCategoriesHandler(svc *categoriessvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		productID, ok := parseIDParam(r, "productID")
		if !ok {
			httpx.Fail(w, http.StatusBadRequest, "invalid_product_id", nil)
			return
		}

		items, err := svc.ListProductCategories(r.Context(), productID)
		if err != nil {
			log.Printf("list_product_categories_failed product_id=%d: %v", productID, err)
			httpx.Fail(w, http.StatusInternalServerError, "list_product_categories_failed", err.Error())
			return
		}
		if items == nil {
			items = []categoriessvc.CategoryDTO{}
		}
		httpx.JSON(w, http.StatusOK, items)
	}
}
