// internal/v1/availability/handlers.go
package availabilityv1

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/zigzagalex/luigi/api/internal/availability"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc *availability.Service
}

func RegisterRoutes(r chi.Router, q db.Querier) {
	svc := availability.NewService(q)
	h := &Handler{svc: svc}

	r.Route("/availability", func(r chi.Router) {
		r.Post("/search", h.Search)
		r.Get("/calendar", h.Calendar)
		r.Post("/quote", h.Quote)
	})
}

// ---------- Search ----------

type searchRequest struct {
	ShopID      *int64  `json:"shop_id,omitempty"`
	StoreID     *int64  `json:"store_id,omitempty"`
	ProductIDs  []int64 `json:"product_ids,omitempty"`
	CategoryIDs []int64 `json:"category_ids,omitempty"`
	StartDate   string  `json:"start_date"` // "YYYY-MM-DD"
	EndDate     string  `json:"end_date"`   // "YYYY-MM-DD" (checkout date)
	Quantity    int32   `json:"quantity"`
}

func (h *Handler) Search(w http.ResponseWriter, r *http.Request) {
	var req searchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_json", err.Error())
		return
	}

	if req.Quantity <= 0 {
		httpx.Fail(w, http.StatusBadRequest, "invalid_quantity", "quantity must be > 0")
		return
	}

	start, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_start_date", err.Error())
		return
	}
	end, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_end_date", err.Error())
		return
	}

	in := availability.SearchInput{
		ShopID:      req.ShopID,
		StoreID:     req.StoreID,
		ProductIDs:  req.ProductIDs,
		CategoryIDs: req.CategoryIDs,
		StartDate:   start,
		EndDate:     end,
		Quantity:    req.Quantity,
	}

	results, err := h.svc.Search(r.Context(), in)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "search_failed", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, results)
}

// ---------- Calendar ----------

func (h *Handler) Calendar(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	variantIDStr := q.Get("product_variant_id")
	storeIDStr := q.Get("store_id")
	fromStr := q.Get("from") // YYYY-MM-DD
	toStr := q.Get("to")     // YYYY-MM-DD

	if variantIDStr == "" || storeIDStr == "" || fromStr == "" || toStr == "" {
		httpx.Fail(w, http.StatusBadRequest, "missing_params", map[string]any{
			"product_variant_id": variantIDStr,
			"store_id":           storeIDStr,
			"from":               fromStr,
			"to":                 toStr,
		})
		return
	}

	variantID, err := strconv.ParseInt(variantIDStr, 10, 64)
	if err != nil || variantID <= 0 {
		httpx.Fail(w, http.StatusBadRequest, "invalid_product_variant_id", variantIDStr)
		return
	}

	storeID, err := strconv.ParseInt(storeIDStr, 10, 64)
	if err != nil || storeID <= 0 {
		httpx.Fail(w, http.StatusBadRequest, "invalid_store_id", storeIDStr)
		return
	}

	from, err := time.Parse("2006-01-02", fromStr)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_from", err.Error())
		return
	}
	to, err := time.Parse("2006-01-02", toStr)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_to", err.Error())
		return
	}

	in := availability.CalendarInput{
		ProductVariantID: variantID,
		StoreID:          storeID,
		FromDate:         from,
		ToDate:           to,
	}

	days, err := h.svc.Calendar(r.Context(), in)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "calendar_failed", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, days)
}

// ---------- Quote ----------

type quoteRequest struct {
	ProductVariantID int64  `json:"product_variant_id"`
	StoreID          int64  `json:"store_id"`
	StartAt          string `json:"start_at"` // RFC3339
	EndAt            string `json:"end_at"`   // RFC3339
	Quantity         int32  `json:"quantity"`
}

func (h *Handler) Quote(w http.ResponseWriter, r *http.Request) {
	var req quoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_json", err.Error())
		return
	}

	if req.ProductVariantID <= 0 || req.StoreID <= 0 {
		httpx.Fail(w, http.StatusBadRequest, "invalid_ids", map[string]any{
			"product_variant_id": req.ProductVariantID,
			"store_id":           req.StoreID,
		})
		return
	}
	if req.Quantity <= 0 {
		httpx.Fail(w, http.StatusBadRequest, "invalid_quantity", "quantity must be > 0")
		return
	}

	startAt, err := time.Parse(time.RFC3339, req.StartAt)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_start_at", err.Error())
		return
	}
	endAt, err := time.Parse(time.RFC3339, req.EndAt)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_end_at", err.Error())
		return
	}

	in := availability.QuoteInput{
		ProductVariantID: req.ProductVariantID,
		StoreID:          req.StoreID,
		StartAt:          startAt,
		EndAt:            endAt,
		Quantity:         req.Quantity,
	}

	res, err := h.svc.Quote(r.Context(), in)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "quote_failed", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, res)
}
