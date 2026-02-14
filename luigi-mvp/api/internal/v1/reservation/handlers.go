package reservationv1

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/zigzagalex/luigi/api/internal/customers"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	"github.com/zigzagalex/luigi/api/internal/middleware"
	"github.com/zigzagalex/luigi/api/internal/reservation"
)

type Handler struct {
	svc     *reservation.Service
	custSvc *customers.Service
}

func RegisterRoutes(
	r chi.Router,
	q *db.Queries,
	sqlDB *sql.DB,
) {
	resSvc := reservation.NewService(q, sqlDB, nil) 
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
	})
}

type checkoutRequest struct {
	ShopID             int64   `json:"shop_id"`
	StoreID            int64   `json:"store_id"`
	IdempotencyKey     string  `json:"idempotency_key"`
	Notes              *string `json:"notes"`
	PickupPersonName   *string `json:"pickup_person_name"`
	PickupPersonPhone  *string `json:"pickup_person_phone"`
	PickupPersonEmail  *string `json:"pickup_person_email"`
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


func (h *Handler) CheckoutFromCart(w http.ResponseWriter, r *http.Request) {
	customerID, err := h.customerIDFromContext(r)
	if err != nil {
		httpx.Fail(w, http.StatusUnauthorized, "not_authenticated", nil)
		return
	}

	var req checkoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_json", err.Error())
		return
	}

	in := reservation.CheckoutInput{
		ShopID:            req.ShopID,
		StoreID:           req.StoreID,
		CustomerID:        customerID,
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

	res, err := h.svc.GetMyReservation(r.Context(), shopID, customerID, resID)
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

