package cartv1

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/zigzagalex/luigi/api/internal/availability"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"

	"github.com/zigzagalex/luigi/api/internal/cart"
	"github.com/zigzagalex/luigi/api/internal/customers"
	"github.com/zigzagalex/luigi/api/internal/daterange"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	"github.com/zigzagalex/luigi/api/internal/middleware"
	"github.com/zigzagalex/luigi/api/internal/stores"
)

type Handler struct {
	svc     *cart.Service
	custSvc *customers.Service
}

func RegisterRoutes(
	r chi.Router,
	q *db.Queries,
	sqlDB *sql.DB,
	av *availability.Service,
	st *stores.Service,
) {
	cartSvc := cart.NewService(q, sqlDB, av, st)
	custSvc := customers.NewService(q)

	h := &Handler{svc: cartSvc, custSvc: custSvc}

	r.Route("/cart", func(r chi.Router) {
		// Read cart (creates an open cart if needed)
		r.Get("/", h.Get)

		// Add N items (one cart_item per inventory item)
		r.Post("/items", h.AddItem)

		// Update one cart_item (quantity must be 1 in your model)
		r.Patch("/items/{cart_item_id}", h.UpdateItem)

		// Delete one cart_item
		r.Delete("/items/{cart_item_id}", h.DeleteItem)

		// Attach guest cart to customer cart
		r.Post("/attach-guest-cart", h.AttachGuestCart)
	})
}

type addItemRequest struct {
	ShopID    int64  `json:"shop_id"`
	StoreID   int64  `json:"store_id"`
	ProductID int64  `json:"product_id"`
	VariantID int64  `json:"variant_id"`
	StartDate string `json:"start_date"` // "YYYY-MM-DD"
	EndDate   string `json:"end_date"`   // "YYYY-MM-DD"
	Quantity  int32  `json:"quantity"`
}

type updateItemRequest struct {
	ShopID    int64  `json:"shop_id"`
	StoreID   int64  `json:"store_id"`
	StartDate string `json:"start_date"` // "YYYY-MM-DD"
	EndDate   string `json:"end_date"`   // "YYYY-MM-DD"
	Quantity  int32  `json:"quantity"`   // must be 1
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	owner, err := h.ownerFromRequest(r)
	if err != nil {
		httpx.Fail(w, http.StatusUnauthorized, "no_owner", nil)
		return
	}

	shopID, err := parseIntQuery(r, "shop_id")
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "missing_params", nil)
		return
	}

	if shopID <= 0 {
		httpx.Fail(w, http.StatusBadRequest, "missing_params", map[string]any{
			"shop_id": shopID,
		})
		return
	}

	res, err := h.svc.GetCart(r.Context(), owner, shopID)
	if err != nil {
		httpx.ServerError(w, "cart_failed", err)
		return
	}

	httpx.JSON(w, http.StatusOK, res)
}

func (h *Handler) AddItem(w http.ResponseWriter, r *http.Request) {
	owner, err := h.ownerFromRequest(r)
	if err != nil {
		httpx.Fail(w, http.StatusUnauthorized, "no_owner", nil)
		return
	}

	var req addItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
		return
	}

	startAt, endAt, err := parseDateRangeZurich(req.StartDate, req.EndDate)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_dates", nil)
		return
	}

	in := cart.AddItemInput{
		ShopID:    req.ShopID,
		StoreID:   req.StoreID,
		ProductID: req.ProductID,
		VariantID: req.VariantID,
		StartAt:   startAt,
		EndAt:     endAt,
		Quantity:  req.Quantity,
	}

	res, err := h.svc.AddItem(r.Context(), owner, in)
	if err != nil {
		writeCartError(w, "add_item_failed", err)
		return
	}

	httpx.JSON(w, http.StatusOK, res)

}

func (h *Handler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	owner, err := h.ownerFromRequest(r)
	if err != nil {
		httpx.Fail(w, http.StatusUnauthorized, "no_owner", nil)
		return
	}

	var req updateItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
		return
	}

	cartItemID, err := parseCartItemIDParam(r)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_cart_item_id", nil)
		return
	}
	startAt, endAt, err := parseDateRangeZurich(req.StartDate, req.EndDate)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_dates", nil)
		return
	}

	in := cart.UpdateItemInput{
		ShopID:     req.ShopID,
		StoreID:    req.StoreID,
		CartItemID: cartItemID,
		StartAt:    startAt,
		EndAt:      endAt,
		Quantity:   req.Quantity,
	}

	res, err := h.svc.UpdateItem(r.Context(), owner, in)
	if err != nil {
		writeCartError(w, "update_cart_item_failed", err)
		return
	}

	httpx.JSON(w, http.StatusOK, res)

}

func (h *Handler) DeleteItem(w http.ResponseWriter, r *http.Request) {
	owner, err := h.ownerFromRequest(r)
	if err != nil {
		httpx.Fail(w, http.StatusUnauthorized, "no_owner", nil)
		return
	}
	cartItemID, err := parseCartItemIDParam(r)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_cart_item_id", nil)
		return
	}
	res, err := h.svc.DeleteItem(r.Context(), owner, cartItemID)
	if err != nil {
		writeCartError(w, "delete_cart_item_failed", err)
		return
	}

	httpx.JSON(w, http.StatusOK, res)
}

func (h *Handler) AttachGuestCart(w http.ResponseWriter, r *http.Request) {
	owner, ok := middleware.UserFromContext(r.Context())
	if !ok {
		httpx.Fail(w, http.StatusUnauthorized, "not_authenticated", nil)
		return
	}

	c, err := r.Cookie("luigi_guest")
	if err != nil || strings.TrimSpace(c.Value) == "" {
		httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
		return
	}

	cust, err := h.custSvc.GetCustomerByUserID(r.Context(), owner.ID)
	if err != nil {
		httpx.ServerError(w, "customer_missing", err)
		return
	}

	shopID, err := parseIntQuery(r, "shop_id")
	if err != nil || shopID <= 0 {
		httpx.Fail(w, http.StatusBadRequest, "missing_shop_id", nil)
		return
	}

	_ = h.svc.AttachGuestCartToCustomer(
		r.Context(),
		shopID,
		c.Value,
		cust.ID,
	)

	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

// Helpers
func (h *Handler) ownerFromRequest(r *http.Request) (cart.Owner, error) {
	ctx := r.Context()

	// 1) Logged-in user with a customer profile → own cart by customer_id
	if u, ok := middleware.UserFromContext(ctx); ok {
		cust, err := h.custSvc.GetCustomerByUserID(ctx, u.ID)
		if err == nil {
			id := cust.ID
			return cart.Owner{CustomerID: &id}, nil
		}
		// Staff/admin (or any user without a customer row) can still shop as a guest.
	}

	// 2) Guest session (cookie)
	if c, err := r.Cookie("luigi_guest"); err == nil {
		sid := strings.TrimSpace(c.Value)
		if sid != "" {
			return cart.Owner{SessionID: &sid}, nil
		}
	}

	return cart.Owner{}, cart.ErrNoOwner
}

func writeCartError(w http.ResponseWriter, code string, err error) {
	switch {
	case errors.Is(err, cart.ErrInvalidQuantity), errors.Is(err, cart.ErrQuantityMustBeOne):
		httpx.Fail(w, http.StatusBadRequest, "invalid_quantity", nil)
	case errors.Is(err, cart.ErrInvalidRange):
		httpx.Fail(w, http.StatusBadRequest, "invalid_dates", nil)
	case errors.Is(err, cart.ErrMissingVariant):
		httpx.Fail(w, http.StatusBadRequest, "missing_variant", nil)
	case errors.Is(err, cart.ErrInsufficientStock):
		httpx.Fail(w, http.StatusConflict, "insufficient_stock", nil)
	case errors.Is(err, cart.ErrDifferentStore):
		httpx.Fail(w, http.StatusConflict, "different_store",
			"Your cart already contains items from another store. Please checkout or clear your cart.")
	case errors.Is(err, cart.ErrCartItemNotFound), errors.Is(err, cart.ErrCartNotFound):
		httpx.Fail(w, http.StatusNotFound, "cart_item_not_found", nil)
	case errors.Is(err, cart.ErrCartNotOpen):
		httpx.Fail(w, http.StatusConflict, "cart_not_open", nil)
	case errors.Is(err, cart.ErrNotYourCart):
		httpx.Fail(w, http.StatusForbidden, "not_your_cart", nil)
	default:
		httpx.ServerError(w, code, err)
	}
}

func parseDateRangeZurich(startDate, endDate string) (time.Time, time.Time, error) {
	return daterange.ParseInclusiveZurich(startDate, endDate)
}

func parseCartItemIDParam(r *http.Request) (int64, error) {
	raw := chi.URLParam(r, "cart_item_id")
	return strconv.ParseInt(raw, 10, 64)
}

func parseIntQuery(r *http.Request, key string) (int64, error) {
	return strconv.ParseInt(r.URL.Query().Get(key), 10, 64)
}
