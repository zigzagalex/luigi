package accessoriesv1

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	accessoriessvc "github.com/zigzagalex/luigi/api/internal/accessories"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

func RegisterRoutes(r chi.Router, q db.Querier) {
	svc := accessoriessvc.NewService(q)

	r.Route("/accessories", func(r chi.Router) {
		r.Get("/", listHandler(svc))
		r.Post("/", createHandler(svc))
		r.Get("/{accessoryID}", getHandler(svc))
		r.Put("/{accessoryID}", updateHandler(svc))
		r.Delete("/{accessoryID}", deleteHandler(svc))
		r.Get("/{accessoryID}/translations", listTranslationsHandler(svc))
		r.Put("/{accessoryID}/translations/{locale}", upsertTranslationHandler(svc))
		r.Delete("/{accessoryID}/translations/{locale}", deleteTranslationHandler(svc))
	})
}

func listHandler(svc *accessoriessvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
		locale := u.GetLocale(r)

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

		ids, err := parseInt64CSV(r.URL.Query().Get("ids"))
		if err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_ids", err.Error())
			return
		}

		items, err := svc.List(r.Context(), accessoriessvc.ListInput{
			ShopID: shopIDPtr,
			Ids:    ids,
			Locale: locale,
			Limit:  int32(limit),
			Offset: int32(offset),
		})
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "list_accessories_failed", err.Error())
			return
		}
		if items == nil {
			items = []accessoriessvc.AccessoryDTO{}
		}
		httpx.JSON(w, http.StatusOK, items)
	}
}

func getHandler(svc *accessoriessvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(chi.URLParam(r, "accessoryID"), 10, 64)
		if err != nil || id <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_id", nil)
			return
		}
		locale := u.GetLocale(r)
		includeTranslations := parseBoolQuery(r, "include_translations")

		dto, err := svc.Get(r.Context(), id, locale, includeTranslations)
		if err != nil {
			if err == accessoriessvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "accessory_not_found", nil)
				return
			}
			log.Printf("get_accessory_failed id=%d: %v", id, err)
			httpx.Fail(w, http.StatusInternalServerError, "get_accessory_failed", err.Error())
			return
		}

		httpx.JSON(w, http.StatusOK, dto)
	}
}

type upsertTranslationReq struct {
	Name                string  `json:"name"`
	Description         *string `json:"description"`
	DetailedDescription *string `json:"detailed_description"`
}

func listTranslationsHandler(svc *accessoriessvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		accessoryID, err := strconv.ParseInt(chi.URLParam(r, "accessoryID"), 10, 64)
		if err != nil || accessoryID <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_accessory_id", nil)
			return
		}

		items, err := svc.ListTranslations(r.Context(), accessoryID)
		if err != nil {
			log.Printf("list_accessory_translations_failed accessory_id=%d: %v", accessoryID, err)
			httpx.Fail(w, http.StatusInternalServerError, "list_accessory_translations_failed", err.Error())
			return
		}
		if items == nil {
			items = []accessoriessvc.AccessoryTranslationDTO{}
		}
		httpx.JSON(w, http.StatusOK, items)
	}
}

func upsertTranslationHandler(svc *accessoriessvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		accessoryID, err := strconv.ParseInt(chi.URLParam(r, "accessoryID"), 10, 64)
		if err != nil || accessoryID <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_accessory_id", nil)
			return
		}

		locale := strings.TrimSpace(chi.URLParam(r, "locale"))
		if locale == "" {
			httpx.Fail(w, http.StatusBadRequest, "locale_required", nil)
			return
		}

		var req upsertTranslationReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}

		name := strings.TrimSpace(req.Name)
		if name == "" {
			httpx.Fail(w, http.StatusBadRequest, "name_required", nil)
			return
		}

		item, err := svc.UpsertTranslation(r.Context(), accessoriessvc.TranslationInput{
			AccessoryID:         accessoryID,
			Locale:              locale,
			Name:                name,
			Description:         u.TrimOrNil(req.Description),
			DetailedDescription: u.TrimOrNil(req.DetailedDescription),
		})
		if err != nil {
			log.Printf("upsert_accessory_translation_failed accessory_id=%d locale=%s: %v", accessoryID, locale, err)
			httpx.Fail(w, http.StatusInternalServerError, "upsert_accessory_translation_failed", err.Error())
			return
		}

		httpx.JSON(w, http.StatusOK, item)
	}
}

func deleteTranslationHandler(svc *accessoriessvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		accessoryID, err := strconv.ParseInt(chi.URLParam(r, "accessoryID"), 10, 64)
		if err != nil || accessoryID <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_accessory_id", nil)
			return
		}

		locale := strings.TrimSpace(chi.URLParam(r, "locale"))
		if locale == "" {
			httpx.Fail(w, http.StatusBadRequest, "locale_required", nil)
			return
		}

		if err := svc.DeleteTranslation(r.Context(), accessoryID, locale); err != nil {
			log.Printf("delete_accessory_translation_failed accessory_id=%d locale=%s: %v", accessoryID, locale, err)
			httpx.Fail(w, http.StatusInternalServerError, "delete_accessory_translation_failed", err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

type createReq struct {
	ShopID      int64   `json:"shop_id"`
	SKU         *string `json:"sku"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	IsActive    *bool   `json:"is_active"`
}

func createHandler(svc *accessoriessvc.Service) http.HandlerFunc {
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

		item, err := svc.Create(r.Context(), accessoriessvc.CreateInput{
			ShopID:      req.ShopID,
			SKU:         u.TrimOrNil(req.SKU),
			Name:        name,
			Description: u.TrimOrNil(req.Description),
			IsActive:    req.IsActive,
		})
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "create_accessory_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}

type updateReq struct {
	SKU         *string `json:"sku"`
	Name        *string `json:"name"`
	Description *string `json:"description"`
	IsActive    *bool   `json:"is_active"`
}

func updateHandler(svc *accessoriessvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(chi.URLParam(r, "accessoryID"), 10, 64)
		if err != nil || id <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_id", nil)
			return
		}

		var req updateReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}

		item, err := svc.Update(r.Context(), accessoriessvc.UpdateInput{
			ID:          id,
			SKU:         u.TrimOrNil(req.SKU),
			Name:        u.TrimOrNil(req.Name),
			Description: u.TrimOrNil(req.Description),
			IsActive:    req.IsActive,
		})
		if err != nil {
			if err == accessoriessvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "accessory_not_found", nil)
				return
			}
			log.Printf("update_accessory_failed id=%d: %v", id, err)
			httpx.Fail(w, http.StatusInternalServerError, "update_accessory_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}

func deleteHandler(svc *accessoriessvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(chi.URLParam(r, "accessoryID"), 10, 64)
		if err != nil || id <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_id", nil)
			return
		}

		item, err := svc.Delete(r.Context(), id)
		if err != nil {
			if err == accessoriessvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "accessory_not_found", nil)
				return
			}
			log.Printf("delete_accessory_failed id=%d: %v", id, err)
			httpx.Fail(w, http.StatusInternalServerError, "delete_accessory_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}

func parseInt64CSV(s string) ([]int64, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil, nil
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

	if len(out) == 0 {
		return nil, nil
	}

	return out, nil
}

func parseBoolQuery(r *http.Request, key string) bool {
	v := strings.TrimSpace(r.URL.Query().Get(key))
	if v == "" {
		return false
	}
	ok, err := strconv.ParseBool(v)
	if err != nil {
		return false
	}
	return ok
}
