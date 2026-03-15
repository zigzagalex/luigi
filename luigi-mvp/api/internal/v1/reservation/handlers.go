package reservationv1

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/zigzagalex/luigi/api/internal/cart"
	"github.com/zigzagalex/luigi/api/internal/customers"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	"github.com/zigzagalex/luigi/api/internal/images"
	"github.com/zigzagalex/luigi/api/internal/middleware"
	"github.com/zigzagalex/luigi/api/internal/reservation"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

type Handler struct {
	svc     *reservation.Service
	custSvc *customers.Service
}

func RegisterRoutes(
	r chi.Router,
	q *db.Queries,
	sqlDB *sql.DB,
	cartSvc *cart.Service,
	imageSvc *images.Service,
) {
	resSvc := reservation.NewService(q, sqlDB, cartSvc, imageSvc)
	custSvc := customers.NewService(q)

	h := &Handler{
		svc:     resSvc,
		custSvc: custSvc,
	}

	r.Route("/reservations", func(r chi.Router) {
		r.Get("/", h.ListMyReservations)
		r.Get("/{reservation_id}", h.GetMyReservation)

		r.Post("/checkout", h.CheckoutFromCart)

		r.Post("/{reservation_id}/cancel", h.CancelMyReservation)
		r.Post("/{reservation_id}/reschedule", h.RescheduleMyReservation)

		r.Post("/{reservation_id}/update", h.UpdateMyReservationDetails)
		r.Post("/{reservation_id}/items/{reservation_item_id}/cancel", h.CancelMyReservationItem)
	})
}

type checkoutRequest struct {
	ShopID            int64   `json:"shop_id"`
	StoreID           int64   `json:"store_id"`
	IdempotencyKey    string  `json:"idempotency_key"`
	Notes             *string `json:"notes"`
	PickupPersonName  *string `json:"pickup_person_name"`
	PickupPersonPhone *string `json:"pickup_person_phone"`
	PickupPersonEmail *string `json:"pickup_person_email"`
}

type cancelRequest struct {
	ShopID          int64   `json:"shop_id"`
	ExpectedVersion int32   `json:"expected_version"`
	CancelReason    *string `json:"cancel_reason"`
}

type rescheduleRequest struct {
	ShopID          int64  `json:"shop_id"`
	ExpectedVersion int32  `json:"expected_version"`
	StartDate       string `json:"start_date"`
	EndDate         string `json:"end_date"`
}

type updateReservationDetailsBody struct {
	ShopID            int64   `json:"shop_id"`
	ExpectedVersion   int32   `json:"expected_version"`
	PickupPersonName  *string `json:"pickup_person_name"`
	PickupPersonPhone *string `json:"pickup_person_phone"`
	PickupPersonEmail *string `json:"pickup_person_email"`
	Notes             *string `json:"notes"`
}

type cancelReservationItemBody struct {
	ShopID          int64 `json:"shop_id"`
	ExpectedVersion int32 `json:"expected_version"`
}

func (h *Handler) CheckoutFromCart(w http.ResponseWriter, r *http.Request) {
	customerID, err := h.customerIDFromContext(r)
	if err != nil {
		httpx.Fail(w, http.StatusUnauthorized, "not_authenticated", nil)
		return
	}
	locale := u.GetLocale(r)

	var req checkoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_json", err.Error())
		return
	}

	in := reservation.CheckoutInput{
		ShopID:            req.ShopID,
		StoreID:           req.StoreID,
		CustomerID:        customerID,
		Locale:            locale,
		IdempotencyKey:    req.IdempotencyKey,
		Notes:             req.Notes,
		PickupPersonName:  req.PickupPersonName,
		PickupPersonPhone: req.PickupPersonPhone,
		PickupPersonEmail: req.PickupPersonEmail,
	}

	res, err := h.svc.CheckoutFromCart(r.Context(), in)
	if err != nil {
		switch {
		case errors.Is(err, reservation.ErrCartEmpty):
			httpx.Fail(w, 400, "cart_empty", err.Error())
		case errors.Is(err, reservation.ErrCartBlocked):
			httpx.Fail(w, 400, "cart_blocked", err.Error())
		case errors.Is(err, reservation.ErrNotAvailableForDates):
			httpx.Fail(w, 409, "inventory_unavailable", err.Error())
		default:
			httpx.Fail(w, 500, "checkout_failed", err.Error())
		}
		return
	}

	httpx.JSON(w, http.StatusOK, res)
}

func (h *Handler) ListMyReservations(w http.ResponseWriter, r *http.Request) {
	customerID, err := h.customerIDFromContext(r)
	if err != nil {
		httpx.Fail(w, http.StatusUnauthorized, "not_authenticated", nil)
		return
	}
	locale := u.GetLocale(r)

	shopID, err := parseIntQuery(r, "shop_id")
	if err != nil || shopID <= 0 {
		httpx.Fail(w, 400, "missing_shop_id", nil)
		return
	}

	limit, _ := parseIntQuery(r, "limit")
	offset, _ := parseIntQuery(r, "offset")

	in := reservation.ListMyReservationsInput{
		ShopID:     shopID,
		CustomerID: customerID,
		Locale:     locale,
		Limit:      int32(limit),
		Offset:     int32(offset),
	}

	res, err := h.svc.ListMyReservations(r.Context(), in)
	if err != nil {
		httpx.Fail(w, 500, "list_failed", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, res)
}

func (h *Handler) GetMyReservation(w http.ResponseWriter, r *http.Request) {
	customerID, err := h.customerIDFromContext(r)
	if err != nil {
		httpx.Fail(w, http.StatusUnauthorized, "not_authenticated", nil)
		return
	}
	locale := u.GetLocale(r)

	shopID, err := parseIntQuery(r, "shop_id")
	if err != nil || shopID <= 0 {
		httpx.Fail(w, 400, "missing_shop_id", nil)
		return
	}

	resID, err := parseReservationIDParam(r)
	if err != nil {
		httpx.Fail(w, 400, "invalid_reservation_id", err.Error())
		return
	}

	res, err := h.svc.GetMyReservation(r.Context(), shopID, customerID, resID, locale)
	if err != nil {
		if errors.Is(err, reservation.ErrReservationNotFound) {
			httpx.Fail(w, 404, "not_found", err.Error())
			return
		}
		httpx.Fail(w, 500, "get_failed", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, res)
}

func (h *Handler) CancelMyReservation(w http.ResponseWriter, r *http.Request) {
	customerID, err := h.customerIDFromContext(r)
	if err != nil {
		httpx.Fail(w, 401, "not_authenticated", nil)
		return
	}
	locale := u.GetLocale(r)

	var req cancelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, 400, "invalid_json", err.Error())
		return
	}

	resID, err := parseReservationIDParam(r)
	if err != nil {
		httpx.Fail(w, 400, "invalid_reservation_id", err.Error())
		return
	}

	in := reservation.CancelInput{
		ShopID:          req.ShopID,
		CustomerID:      customerID,
		ReservationID:   resID,
		Locale:          locale,
		ExpectedVersion: req.ExpectedVersion,
		CancelReason:    req.CancelReason,
	}

	res, err := h.svc.CancelMyReservation(r.Context(), in)
	if err != nil {
		if errors.Is(err, reservation.ErrOptimisticLock) {
			httpx.Fail(w, 409, "version_conflict", err.Error())
			return
		}
		httpx.Fail(w, 500, "cancel_failed", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, res)
}

func (h *Handler) RescheduleMyReservation(w http.ResponseWriter, r *http.Request) {
	customerID, err := h.customerIDFromContext(r)
	if err != nil {
		httpx.Fail(w, 401, "not_authenticated", nil)
		return
	}
	locale := u.GetLocale(r)

	var req rescheduleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, 400, "invalid_json", err.Error())
		return
	}

	resID, err := parseReservationIDParam(r)
	if err != nil {
		httpx.Fail(w, 400, "invalid_reservation_id", err.Error())
		return
	}

	startAt, endAt, err := parseDateRangeZurich(req.StartDate, req.EndDate)
	if err != nil {
		httpx.Fail(w, 400, "invalid_dates", err.Error())
		return
	}

	in := reservation.RescheduleInput{
		ShopID:          req.ShopID,
		CustomerID:      customerID,
		ReservationID:   resID,
		Locale:          locale,
		ExpectedVersion: req.ExpectedVersion,
		StartAt:         startAt,
		EndAt:           endAt,
	}

	res, err := h.svc.RescheduleMyReservation(r.Context(), in)
	if err != nil {
		switch {
		case errors.Is(err, reservation.ErrOptimisticLock):
			httpx.Fail(w, 409, "version_conflict", err.Error())
		case errors.Is(err, reservation.ErrNotAvailableForDates):
			httpx.Fail(w, 409, "inventory_unavailable", err.Error())
		default:
			httpx.Fail(w, 500, "reschedule_failed", err.Error())
		}
		return
	}

	httpx.JSON(w, http.StatusOK, res)
}

func (h *Handler) customerIDFromContext(r *http.Request) (int64, error) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		return 0, errors.New("not authenticated")
	}

	cust, err := h.custSvc.GetCustomerByUserID(r.Context(), u.ID)
	if err != nil {
		return 0, err
	}
	return cust.ID, nil
}

func (h *Handler) UpdateMyReservationDetails(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	locale := u.GetLocale(r)

	// route params
	reservationID, err := parseChiIDParam(r, "reservation_id") // use your existing helper; see below if you don’t have one
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid_reservation_id"})
		return
	}

	// auth (match your existing pattern)
	customerID, err := h.customerIDFromContext(r) // adapt to your auth helper
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "unauthorized"})
		return
	}

	var body updateReservationDetailsBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid_json_body"})
		return
	}
	if body.ShopID <= 0 || body.ExpectedVersion <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "missing_shop_id_or_expected_version"})
		return
	}

	out, err := h.svc.UpdateMyReservationDetails(ctx, reservation.UpdateDetailsInput{
		ShopID:            body.ShopID,
		CustomerID:        customerID,
		ReservationID:     reservationID,
		Locale:            locale,
		ExpectedVersion:   body.ExpectedVersion,
		PickupPersonName:  body.PickupPersonName,
		PickupPersonPhone: body.PickupPersonPhone,
		PickupPersonEmail: body.PickupPersonEmail,
		Notes:             body.Notes,
	})
	if err != nil {
		switch {
		case errors.Is(err, reservation.ErrOptimisticLock):
			writeJSON(w, http.StatusConflict, map[string]any{"error": "version_conflict"})
		case errors.Is(err, reservation.ErrReservationNotFound):
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "reservation_not_found"})
		default:
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "internal_error"})
		}
		return
	}

	writeJSON(w, http.StatusOK, out)
}

func (h *Handler) CancelMyReservationItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	locale := u.GetLocale(r)

	reservationID, err := parseChiIDParam(r, "reservation_id")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid_reservation_id"})
		return
	}

	reservationItemID, err := parseChiIDParam(r, "reservation_item_id")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid_reservation_item_id"})
		return
	}

	customerID, err := h.customerIDFromContext(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "unauthorized"})
		return
	}

	var body cancelReservationItemBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid_json_body"})
		return
	}
	if body.ShopID <= 0 || body.ExpectedVersion <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "missing_shop_id_or_expected_version"})
		return
	}

	out, err := h.svc.CancelMyReservationItem(ctx, reservation.CancelItemInput{
		ShopID:            body.ShopID,
		CustomerID:        customerID,
		ReservationID:     reservationID,
		ReservationItemID: reservationItemID,
		Locale:            locale,
		ExpectedVersion:   body.ExpectedVersion,
	})
	if err != nil {
		switch {
		case errors.Is(err, reservation.ErrOptimisticLock):
			writeJSON(w, http.StatusConflict, map[string]any{"error": "version_conflict"})
		case errors.Is(err, reservation.ErrReservationNotFound):
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "reservation_not_found"})
		default:
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "internal_error"})
		}
		return
	}

	writeJSON(w, http.StatusOK, out)
}

func parseReservationIDParam(r *http.Request) (int64, error) {
	raw := chi.URLParam(r, "reservation_id")
	return strconv.ParseInt(raw, 10, 64)
}

func parseIntQuery(r *http.Request, key string) (int64, error) {
	return strconv.ParseInt(strings.TrimSpace(r.URL.Query().Get(key)), 10, 64)
}

func parseDateRangeZurich(startDate, endDate string) (time.Time, time.Time, error) {
	startDate = strings.TrimSpace(startDate)
	endDate = strings.TrimSpace(endDate)
	if startDate == "" || endDate == "" {
		return time.Time{}, time.Time{}, errors.New("start_date and end_date required")
	}

	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}

	loc, _ := time.LoadLocation("Europe/Zurich")
	startAt := time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, loc)
	endAt := time.Date(end.Year(), end.Month(), end.Day(), 0, 0, 0, 0, loc)

	return startAt, endAt, nil
}

func parseChiIDParam(r *http.Request, key string) (int64, error) {
	raw := chi.URLParam(r, key)
	if raw == "" {
		return 0, fmt.Errorf("missing %s", key)
	}
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || id <= 0 {
		return 0, fmt.Errorf("invalid %s", key)
	}
	return id, nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
