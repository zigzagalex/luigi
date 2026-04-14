package adminreservationsv1

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/lib/pq"
	"github.com/zigzagalex/luigi/api/internal/httpx"
)

type Handler struct {
	db *sql.DB
}

func RegisterRoutes(r chi.Router, sqlDB *sql.DB) {
	h := &Handler{db: sqlDB}
	r.Route("/admin/reservations", func(r chi.Router) {
		r.Get("/search", h.Search)
		r.Get("/", h.ListByShop)
		r.Post("/{reservation_id}/status", h.UpdateStatus)
	})
}

type listReservationRow struct {
	ID                int64
	ShopID            int64
	StoreID           int64
	Status            string
	StartAt           string
	EndAt             string
	TotalPriceCents   int32
	Currency          string
	Version           int32
	CustomerID        sql.NullInt64
	CustomerFirstName sql.NullString
	CustomerLastName  sql.NullString
	CustomerPhone     sql.NullString
	CustomerEmail     sql.NullString
	CustomerAddress1  sql.NullString
	CustomerAddress2  sql.NullString
	CustomerPostal    sql.NullString
	CustomerCity      sql.NullString
	CustomerCountry   sql.NullString
	PickupName        sql.NullString
	PickupPhone       sql.NullString
	PickupEmail       sql.NullString
}

type reservationItemOut struct {
	ID      int64  `json:"id"`
	Name    string `json:"name"`
	Details string `json:"details,omitempty"`
}

type listReservationItemRow struct {
	ReservationID int64
	ID            int64
	ProductName   sql.NullString
	VariantLabel  sql.NullString
	Quantity      int32
}

type listReservationResponse struct {
	ReservationID   int64  `json:"reservation_id"`
	ShopID          int64  `json:"shop_id"`
	StoreID         int64  `json:"store_id"`
	Status          string `json:"status"`
	StartAt         string `json:"start_at"`
	EndAt           string `json:"end_at"`
	TotalPriceCents int32  `json:"total_price_cents"`
	Currency        string `json:"currency"`
	Version         int32  `json:"version"`
	Customer        struct {
		ID         *int64  `json:"id"`
		FirstName  *string `json:"first_name"`
		LastName   *string `json:"last_name"`
		Phone      *string `json:"phone"`
		Email      *string `json:"email"`
		Address1   *string `json:"address1,omitempty"`
		Address2   *string `json:"address2,omitempty"`
		PostalCode *string `json:"postal_code,omitempty"`
		City       *string `json:"city,omitempty"`
		Country    *string `json:"country,omitempty"`
	} `json:"customer"`
	PickupPerson struct {
		FirstName *string `json:"first_name"`
		LastName  *string `json:"last_name"`
		Phone     *string `json:"phone"`
		Email     *string `json:"email"`
	} `json:"pickup_person"`
	Items []reservationItemOut `json:"items"`
}

func (h *Handler) ListByShop(w http.ResponseWriter, r *http.Request) {
	shopID, err := parseIntQuery(r, "shop_id")
	if err != nil || shopID <= 0 {
		httpx.Fail(w, http.StatusBadRequest, "invalid_shop_id", nil)
		return
	}
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	if status == "" {
		status = "confirmed"
	}
	limit, _ := parseIntQuery(r, "limit")
	offset, _ := parseIntQuery(r, "offset")
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}
	locale := strings.TrimSpace(r.URL.Query().Get("locale"))
	if locale == "" {
		locale = "en"
	}

	rows, err := h.db.QueryContext(r.Context(), `
SELECT
  r.id,
  r.shop_id,
  r.store_id,
  r.status::text,
  to_char(r.start_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS start_at,
  to_char(r.end_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS end_at,
  r.total_price_cents,
  r.currency,
  r.version,
  r.customer_id,
  c.first_name,
  c.last_name,
  c.phone,
  c.email,
  NULL::text,
  NULL::text,
  NULL::text,
  NULL::text,
  NULL::text,
  r.pickup_person_name,
  r.pickup_person_phone,
  r.pickup_person_email
FROM reservations r
LEFT JOIN customers c ON c.id = r.customer_id
WHERE r.shop_id = $1 AND r.status = $2::reservation_status
ORDER BY r.created_at DESC
LIMIT $3 OFFSET $4
`, shopID, status, limit, offset)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "list_admin_reservations_failed", err.Error())
		return
	}
	defer rows.Close()

	base := make([]listReservationRow, 0)
	ids := make([]int64, 0)
	for rows.Next() {
		var it listReservationRow
		if err := rows.Scan(
			&it.ID,
			&it.ShopID,
			&it.StoreID,
			&it.Status,
			&it.StartAt,
			&it.EndAt,
			&it.TotalPriceCents,
			&it.Currency,
			&it.Version,
			&it.CustomerID,
			&it.CustomerFirstName,
			&it.CustomerLastName,
			&it.CustomerPhone,
			&it.CustomerEmail,
			&it.CustomerAddress1,
			&it.CustomerAddress2,
			&it.CustomerPostal,
			&it.CustomerCity,
			&it.CustomerCountry,
			&it.PickupName,
			&it.PickupPhone,
			&it.PickupEmail,
		); err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "scan_admin_reservations_failed", err.Error())
			return
		}
		base = append(base, it)
		ids = append(ids, it.ID)
	}
	if err := rows.Err(); err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "list_admin_reservations_failed", err.Error())
		return
	}

	itemsByRes, err := h.loadReservationItems(r.Context(), ids, locale)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "list_admin_reservation_items_failed", err.Error())
		return
	}

	out := make([]listReservationResponse, 0, len(base))
	for _, row := range base {
		out = append(out, rowToListReservationResponse(row, itemsByRes))
	}

	httpx.JSON(w, http.StatusOK, out)
}

func (h *Handler) Search(w http.ResponseWriter, r *http.Request) {
	shopID, err := parseIntQuery(r, "shop_id")
	if err != nil || shopID <= 0 {
		httpx.Fail(w, http.StatusBadRequest, "invalid_shop_id", nil)
		return
	}
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		httpx.JSON(w, http.StatusOK, []listReservationResponse{})
		return
	}
	includeCancelled := parseBoolQuery(r, "include_cancelled", false)
	limit, _ := parseIntQuery(r, "limit")
	offset, _ := parseIntQuery(r, "offset")
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	locale := strings.TrimSpace(r.URL.Query().Get("locale"))
	if locale == "" {
		locale = "en"
	}

	var storeIDArg interface{}
	if s := strings.TrimSpace(r.URL.Query().Get("store_id")); s != "" {
		v, err := strconv.ParseInt(s, 10, 64)
		if err != nil || v <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_store_id", nil)
			return
		}
		storeIDArg = v
	}

	pattern := sqlLikePattern(q)

	rows, err := h.db.QueryContext(r.Context(), `
SELECT
  r.id,
  r.shop_id,
  r.store_id,
  r.status::text,
  to_char(r.start_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS start_at,
  to_char(r.end_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS end_at,
  r.total_price_cents,
  r.currency,
  r.version,
  r.customer_id,
  c.first_name,
  c.last_name,
  c.phone,
  c.email,
  c.address1,
  c.address2,
  c.postal_code,
  c.city,
  c.country,
  r.pickup_person_name,
  r.pickup_person_phone,
  r.pickup_person_email
FROM reservations r
LEFT JOIN customers c ON c.id = r.customer_id
WHERE r.shop_id = $1
  AND ($2::bigint IS NULL OR r.store_id = $2::bigint)
  AND ($3::boolean OR r.status <> 'cancelled'::reservation_status)
  AND (
    COALESCE(c.first_name, '') ILIKE $4 ESCAPE '\'
    OR COALESCE(c.last_name, '') ILIKE $4 ESCAPE '\'
    OR COALESCE(c.email, '') ILIKE $4 ESCAPE '\'
    OR COALESCE(c.phone, '') ILIKE $4 ESCAPE '\'
    OR COALESCE(c.address1, '') ILIKE $4 ESCAPE '\'
    OR COALESCE(c.address2, '') ILIKE $4 ESCAPE '\'
    OR COALESCE(c.postal_code, '') ILIKE $4 ESCAPE '\'
    OR COALESCE(c.city, '') ILIKE $4 ESCAPE '\'
    OR COALESCE(c.country, '') ILIKE $4 ESCAPE '\'
  )
ORDER BY r.created_at DESC
LIMIT $5 OFFSET $6
`, shopID, storeIDArg, includeCancelled, pattern, limit, offset)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "search_admin_reservations_failed", err.Error())
		return
	}
	defer rows.Close()

	base := make([]listReservationRow, 0)
	ids := make([]int64, 0)
	for rows.Next() {
		var it listReservationRow
		if err := rows.Scan(
			&it.ID,
			&it.ShopID,
			&it.StoreID,
			&it.Status,
			&it.StartAt,
			&it.EndAt,
			&it.TotalPriceCents,
			&it.Currency,
			&it.Version,
			&it.CustomerID,
			&it.CustomerFirstName,
			&it.CustomerLastName,
			&it.CustomerPhone,
			&it.CustomerEmail,
			&it.CustomerAddress1,
			&it.CustomerAddress2,
			&it.CustomerPostal,
			&it.CustomerCity,
			&it.CustomerCountry,
			&it.PickupName,
			&it.PickupPhone,
			&it.PickupEmail,
		); err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "scan_admin_reservations_failed", err.Error())
			return
		}
		base = append(base, it)
		ids = append(ids, it.ID)
	}
	if err := rows.Err(); err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "search_admin_reservations_failed", err.Error())
		return
	}

	itemsByRes, err := h.loadReservationItems(r.Context(), ids, locale)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "list_admin_reservation_items_failed", err.Error())
		return
	}

	out := make([]listReservationResponse, 0, len(base))
	for _, row := range base {
		out = append(out, rowToListReservationResponse(row, itemsByRes))
	}

	httpx.JSON(w, http.StatusOK, out)
}

func sqlLikePattern(q string) string {
	replacer := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return "%" + replacer.Replace(q) + "%"
}

func parseBoolQuery(r *http.Request, key string, def bool) bool {
	s := strings.TrimSpace(strings.ToLower(r.URL.Query().Get(key)))
	if s == "" {
		return def
	}
	return s == "1" || s == "true" || s == "yes"
}

func rowToListReservationResponse(row listReservationRow, itemsByRes map[int64][]reservationItemOut) listReservationResponse {
	items := itemsByRes[row.ID]
	if items == nil {
		items = []reservationItemOut{}
	}
	res := listReservationResponse{
		ReservationID:   row.ID,
		ShopID:          row.ShopID,
		StoreID:         row.StoreID,
		Status:          row.Status,
		StartAt:         row.StartAt,
		EndAt:           row.EndAt,
		TotalPriceCents: row.TotalPriceCents,
		Currency:        row.Currency,
		Version:         row.Version,
		Items:           items,
	}
	res.Customer.ID = ptrInt64(row.CustomerID)
	res.Customer.FirstName = ptrString(row.CustomerFirstName)
	res.Customer.LastName = ptrString(row.CustomerLastName)
	res.Customer.Phone = ptrString(row.CustomerPhone)
	res.Customer.Email = ptrString(row.CustomerEmail)
	res.Customer.Address1 = ptrString(row.CustomerAddress1)
	res.Customer.Address2 = ptrString(row.CustomerAddress2)
	res.Customer.PostalCode = ptrString(row.CustomerPostal)
	res.Customer.City = ptrString(row.CustomerCity)
	res.Customer.Country = ptrString(row.CustomerCountry)
	pickupFirst, pickupLast := splitName(ptrString(row.PickupName))
	res.PickupPerson.FirstName = pickupFirst
	res.PickupPerson.LastName = pickupLast
	res.PickupPerson.Phone = ptrString(row.PickupPhone)
	res.PickupPerson.Email = ptrString(row.PickupEmail)
	return res
}

func (h *Handler) loadReservationItems(ctx context.Context, ids []int64, locale string) (map[int64][]reservationItemOut, error) {
	if len(ids) == 0 {
		return map[int64][]reservationItemOut{}, nil
	}
	itemRows, err := h.db.QueryContext(ctx, `
SELECT
  ri.reservation_id,
  ri.id,
  COALESCE(pt.name, p.name) AS product_name,
  pv.label AS variant_label,
  ri.quantity
FROM reservation_items ri
LEFT JOIN products p ON p.id = ri.product_id
LEFT JOIN product_translations pt ON pt.product_id = p.id AND pt.locale = $2
LEFT JOIN product_variants pv ON pv.id = ri.variant_id
WHERE ri.reservation_id = ANY($1) AND ri.is_active = true
ORDER BY ri.reservation_id, ri.id
`, pq.Array(ids), locale)
	if err != nil {
		return nil, err
	}
	defer itemRows.Close()

	itemsByRes := map[int64][]reservationItemOut{}
	for itemRows.Next() {
		var it listReservationItemRow
		if err := itemRows.Scan(&it.ReservationID, &it.ID, &it.ProductName, &it.VariantLabel, &it.Quantity); err != nil {
			return nil, err
		}
		name := "Item"
		if it.ProductName.Valid && strings.TrimSpace(it.ProductName.String) != "" {
			name = it.ProductName.String
		}
		details := ""
		if it.VariantLabel.Valid && strings.TrimSpace(it.VariantLabel.String) != "" {
			details = it.VariantLabel.String
		}
		if it.Quantity > 1 {
			if details == "" {
				details = "Qty " + strconv.Itoa(int(it.Quantity))
			} else {
				details = details + " · Qty " + strconv.Itoa(int(it.Quantity))
			}
		}
		itemsByRes[it.ReservationID] = append(itemsByRes[it.ReservationID], reservationItemOut{
			ID:      it.ID,
			Name:    name,
			Details: details,
		})
	}
	if err := itemRows.Err(); err != nil {
		return nil, err
	}
	return itemsByRes, nil
}

type updateStatusBody struct {
	ShopID          int64  `json:"shop_id"`
	ExpectedVersion int32  `json:"expected_version"`
	Status          string `json:"status"`
}

func (h *Handler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	reservationID, err := parseChiIDParam(r, "reservation_id")
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_reservation_id", err.Error())
		return
	}
	var body updateStatusBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_json", err.Error())
		return
	}
	if body.ShopID <= 0 || body.ExpectedVersion <= 0 {
		httpx.Fail(w, http.StatusBadRequest, "invalid_shop_or_version", nil)
		return
	}
	if !isAllowedStatus(body.Status) {
		httpx.Fail(w, http.StatusBadRequest, "invalid_status", nil)
		return
	}

	var currentStatus string
	var currentVersion int32
	err = h.db.QueryRowContext(r.Context(), `
SELECT status::text, version
FROM reservations
WHERE id = $1 AND shop_id = $2
`, reservationID, body.ShopID).Scan(&currentStatus, &currentVersion)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			httpx.Fail(w, http.StatusNotFound, "reservation_not_found", nil)
			return
		}
		httpx.Fail(w, http.StatusInternalServerError, "load_status_failed", err.Error())
		return
	}
	if currentVersion != body.ExpectedVersion {
		httpx.Fail(w, http.StatusConflict, "version_conflict", nil)
		return
	}
	if !isAllowedTransition(currentStatus, body.Status) {
		httpx.Fail(w, http.StatusBadRequest, "invalid_transition", nil)
		return
	}

	var nextVersion int32
	err = h.db.QueryRowContext(r.Context(), `
UPDATE reservations
SET status = $1::reservation_status, version = version + 1, updated_at = now()
WHERE id = $2 AND shop_id = $3 AND version = $4
RETURNING version
`, body.Status, reservationID, body.ShopID, body.ExpectedVersion).Scan(&nextVersion)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			httpx.Fail(w, http.StatusConflict, "version_conflict", nil)
			return
		}
		httpx.Fail(w, http.StatusInternalServerError, "update_status_failed", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"reservation_id": reservationID,
		"status":         body.Status,
		"version":        nextVersion,
	})
}

func ptrString(v sql.NullString) *string {
	if !v.Valid || strings.TrimSpace(v.String) == "" {
		return nil
	}
	s := v.String
	return &s
}

func ptrInt64(v sql.NullInt64) *int64 {
	if !v.Valid {
		return nil
	}
	x := v.Int64
	return &x
}

func splitName(full *string) (*string, *string) {
	if full == nil || strings.TrimSpace(*full) == "" {
		return nil, nil
	}
	parts := strings.Fields(strings.TrimSpace(*full))
	if len(parts) == 1 {
		return &parts[0], nil
	}
	first := parts[0]
	last := strings.Join(parts[1:], " ")
	return &first, &last
}

func parseIntQuery(r *http.Request, key string) (int64, error) {
	return strconv.ParseInt(strings.TrimSpace(r.URL.Query().Get(key)), 10, 64)
}

func parseChiIDParam(r *http.Request, key string) (int64, error) {
	raw := chi.URLParam(r, key)
	if raw == "" {
		return 0, errors.New("missing id")
	}
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || id <= 0 {
		return 0, errors.New("invalid id")
	}
	return id, nil
}

func isAllowedStatus(status string) bool {
	switch status {
	case "confirmed", "out_for_pickup", "in_use", "returned", "serviced", "cancelled", "expired", "closed":
		return true
	default:
		return false
	}
}

func isAllowedTransition(from, to string) bool {
	if to == "cancelled" {
		return from != "cancelled" && from != "closed" && from != "expired"
	}
	switch from {
	case "confirmed":
		return to == "out_for_pickup"
	case "out_for_pickup":
		return to == "in_use"
	case "in_use":
		return to == "returned"
	case "returned":
		return to == "serviced"
	case "serviced":
		return to == "closed"
	default:
		return false
	}
}
