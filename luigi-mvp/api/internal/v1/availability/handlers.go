// internal/v1/availability/handlers.go
package availabilityv1

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/zigzagalex/luigi/api/internal/availability"
	"github.com/zigzagalex/luigi/api/internal/daterange"
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
		httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
		return
	}

	log.Printf("availability search: shop=%v store=%v categories=%v from=%s to=%s qty=%d",
		req.ShopID, req.StoreID, req.CategoryIDs, req.StartDate, req.EndDate, req.Quantity,
	)

	if req.Quantity <= 0 {
		httpx.Fail(w, http.StatusBadRequest, "invalid_quantity", "quantity must be > 0")
		return
	}

	startAt, endAt, err := daterange.ParseInclusiveZurich(req.StartDate, req.EndDate)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_date_range", nil)
		return
	}

	in := availability.SearchInput{
		ShopID:      req.ShopID,
		StoreID:     req.StoreID,
		ProductIDs:  req.ProductIDs,
		CategoryIDs: req.CategoryIDs,
		StartAt:     startAt,
		EndAt:       endAt,
		Quantity:    req.Quantity,
	}

	results, err := h.svc.Search(r.Context(), in)
	if err != nil {
		httpx.ServerError(w, "search_failed", err)
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
		httpx.Fail(w, http.StatusBadRequest, "invalid_from", nil)
		return
	}
	to, err := time.Parse("2006-01-02", toStr)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_to", nil)
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
		httpx.ServerError(w, "calendar_failed", err)
		return
	}

	httpx.JSON(w, http.StatusOK, days)
}

// ---------- Quote ----------
type quoteRequest struct {
	ProductVariantID int64 `json:"product_variant_id"`
	StoreID          int64 `json:"store_id"`
	Quantity         int32 `json:"quantity"`

	// Preferred (date-only) — matches your UI and avoids timezone drift
	StartDate string `json:"start_date,omitempty"` // "YYYY-MM-DD"
	EndDate   string `json:"end_date,omitempty"`   // "YYYY-MM-DD"

	// Legacy (datetime) — keep for backwards compatibility
	StartAt string `json:"start_at,omitempty"` // RFC3339
	EndAt   string `json:"end_at,omitempty"`   // RFC3339
}

func (h *Handler) Quote(w http.ResponseWriter, r *http.Request) {
	var req quoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
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

	// We prefer date-only (start_date/end_date) because rentals are “calendar days”
	// and it avoids off-by-one / DST issues.
	var startAt time.Time
	var endAt time.Time

	if req.StartDate != "" && req.EndDate != "" {
		var err error
		startAt, endAt, err = daterange.ParseInclusiveZurich(req.StartDate, req.EndDate)
		if err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_date_range", nil)
			return
		}
	} else {
		// Fallback to legacy RFC3339
		var err error
		startAt, err = time.Parse(time.RFC3339, req.StartAt)
		if err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_start_at", nil)
			return
		}
		endAt, err = time.Parse(time.RFC3339, req.EndAt)
		if err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_end_at", nil)
			return
		}
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
		httpx.ServerError(w, "quote_failed", err)
		return
	}

	httpx.JSON(w, http.StatusOK, res)
}
