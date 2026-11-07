package authv1

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/zigzagalex/luigi/api/internal/auth"
	avsvc "github.com/zigzagalex/luigi/api/internal/availability"
	cartsvc "github.com/zigzagalex/luigi/api/internal/cart"
	customersvc "github.com/zigzagalex/luigi/api/internal/customers"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	"github.com/zigzagalex/luigi/api/internal/middleware"
	"github.com/zigzagalex/luigi/api/internal/stores"
	usersvc "github.com/zigzagalex/luigi/api/internal/users"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

const customerCookieName = "luigi_customer"
const staffCookieName = "luigi_staff"
const legacyCookieName = "luigi_session" // cleared on set/logout so old local cookies die
const guestCookieName = "luigi_guest"

const sessionTTL = 7 * 24 * time.Hour

const audienceCustomer = "customer"
const audienceStaff = "staff"

type Handler struct {
	env           string
	sessionSecret string
	q             *db.Queries
	db            *sql.DB
	users         *usersvc.Service
	cartSvc       *cartsvc.Service
	customers     *customersvc.Service
}

func RegisterRoutes(r chi.Router, q *db.Queries, sqlDB *sql.DB, env, sessionSecret string, av *avsvc.Service, st *stores.Service) {
	us := usersvc.NewService(q)
	cartSvc := cartsvc.NewService(q, sqlDB, av, st)
	cs := customersvc.NewService(q)

	h := &Handler{
		env:           env,
		sessionSecret: sessionSecret,
		q:             q,
		db:            sqlDB,
		users:         us,
		cartSvc:       cartSvc,
		customers:     cs,
	}

	authLimit := middleware.RateLimit(20, time.Minute)

	r.Route("/auth", func(r chi.Router) {
		r.Post("/guest", h.GuestSession)
		r.With(authLimit).Post("/register", h.Register)
		r.With(authLimit).Post("/login", h.Login)
		r.Post("/logout", h.Logout)

		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireAudienceSessionCookie(sessionSecret, q, us, customerCookieName, staffCookieName))
			r.Get("/me", h.Me)
		})
	})

	r.Group(func(r chi.Router) {
		r.Use(middleware.RequireSessionCookie(sessionSecret, q, us, customerCookieName))
		r.Get("/me/customer", h.GetMyCustomer)
		r.Put("/me/customer", h.UpsertMyCustomer)
	})
}

type registerReq struct {
	Email      string `json:"email"`
	Password   string `json:"password"`
	ShopID     int64  `json:"shop_id"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Phone      string `json:"phone"`
	Address1   string `json:"address1"`
	Address2   string `json:"address2,omitempty"`
	PostalCode string `json:"postal_code"`
	City       string `json:"city"`
	Country    string `json:"country,omitempty"`
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	// Audience selects which cookie to set: "customer" (shop) or "staff" (admin).
	Audience string `json:"audience,omitempty"`
}

type logoutReq struct {
	ShopID   int64  `json:"shop_id"`
	Audience string `json:"audience,omitempty"`
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req registerReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
		return
	}

	email := strings.TrimSpace(req.Email)
	password := req.Password
	firstName := strings.TrimSpace(req.FirstName)
	lastName := strings.TrimSpace(req.LastName)
	phone := strings.TrimSpace(req.Phone)

	if email == "" {
		httpx.Fail(w, http.StatusBadRequest, "email_required", nil)
		return
	}
	if req.ShopID <= 0 || firstName == "" || lastName == "" || phone == "" {
		httpx.Fail(w, http.StatusBadRequest, "missing_profile_fields", map[string]any{
			"shop_id":    req.ShopID,
			"first_name": firstName,
			"last_name":  lastName,
			"phone":      phone,
		})
		return
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		if errors.Is(err, auth.ErrWeakPassword) {
			httpx.Fail(w, http.StatusBadRequest, "weak_password", err.Error())
			return
		}
		httpx.ServerError(w, "hash_password_failed", err)
		return
	}

	display := firstName + " " + lastName
	role := "customer"

	tx, err := h.db.BeginTx(ctx, nil)
	if err != nil {
		httpx.ServerError(w, "tx_begin_failed", err)
		return
	}
	defer tx.Rollback()

	qtx := h.q.WithTx(tx)
	us := usersvc.NewService(qtx)
	cs := customersvc.NewService(qtx)

	user, err := us.Create(ctx, usersvc.CreateInput{
		ShopID:       &req.ShopID,
		Email:        email,
		Phone:        &phone,
		DisplayName:  &display,
		PasswordHash: hash,
		Role:         &role,
	})
	if err != nil {
		if isPostgresUniqueViolation(err) {
			httpx.Fail(w, http.StatusConflict, "email_already_exists", nil)
			return
		}
		if isPostgresFKViolation(err) {
			httpx.Fail(w, http.StatusBadRequest, "shop_id_not_found", nil)
			return
		}
		httpx.ServerError(w, "register_failed", err)
		return
	}

	emailCopy := email
	_, err = cs.Create(ctx, customersvc.CreateInput{
		ShopID:    req.ShopID,
		UserID:    &user.ID,
		Email:     &emailCopy,
		Phone:     &phone,
		FirstName: &firstName,
		LastName:  &lastName,
		IsActive:  ptrBool(true),
	})
	if err != nil {
		httpx.ServerError(w, "customer_create_failed", err)
		return
	}

	if err := tx.Commit(); err != nil {
		httpx.ServerError(w, "tx_commit_failed", err)
		return
	}

	if err := h.issueSession(w, r, user.ID, customerCookieName); err != nil {
		httpx.ServerError(w, "session_create_failed", err)
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req loginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
		return
	}

	email := strings.TrimSpace(req.Email)
	if email == "" || req.Password == "" {
		httpx.Fail(w, http.StatusUnauthorized, "invalid_credentials", nil)
		return
	}

	user, err := h.users.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, usersvc.ErrNotFound) {
			httpx.Fail(w, http.StatusUnauthorized, "invalid_credentials", nil)
			return
		}
		httpx.ServerError(w, "login_failed", err)
		return
	}

	ok, err := auth.CheckPassword(user.PasswordHash, req.Password)
	if err != nil || !ok {
		httpx.Fail(w, http.StatusUnauthorized, "invalid_credentials", nil)
		return
	}
	if !user.IsActive {
		httpx.Fail(w, http.StatusForbidden, "user_inactive", nil)
		return
	}

	cookieName, err := cookieNameForAudience(req.Audience, user)
	if err != nil {
		httpx.Fail(w, http.StatusForbidden, "access_denied", nil)
		return
	}

	if err := h.issueSession(w, r, user.ID, cookieName); err != nil {
		httpx.ServerError(w, "session_create_failed", err)
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func cookieNameForAudience(audience string, user db.User) (string, error) {
	kind := strings.ToLower(strings.TrimSpace(audience))
	if kind == "" {
		kind = audienceCustomer
	}
	role := ""
	if user.Role.Valid {
		role = strings.ToLower(strings.TrimSpace(user.Role.String))
	}
	switch kind {
	case audienceStaff:
		if role != "admin" && role != "staff" {
			return "", errors.New("staff_required")
		}
		return staffCookieName, nil
	case audienceCustomer:
		return customerCookieName, nil
	default:
		return "", errors.New("invalid_audience")
	}
}

func (h *Handler) issueSession(w http.ResponseWriter, r *http.Request, userID int64, cookieName string) error {
	token, err := auth.NewSessionToken()
	if err != nil {
		return err
	}
	expiresAt := time.Now().UTC().Add(sessionTTL)
	_, err = h.q.CreateSession(r.Context(), &db.CreateSessionParams{
		UserID:    userID,
		TokenHash: auth.HashToken(h.sessionSecret, token),
		ExpiresAt: expiresAt,
	})
	if err != nil {
		return err
	}

	secure := h.env != "dev"
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(sessionTTL.Seconds()),
	})
	// Drop the shared legacy cookie so an old luigi_session cannot override the new pair.
	clearAuthCookie(w, legacyCookieName, secure)
	return nil
}

func clearAuthCookie(w http.ResponseWriter, name string, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	secure := h.env != "dev"

	var req logoutReq
	_ = json.NewDecoder(r.Body).Decode(&req)

	kind := strings.ToLower(strings.TrimSpace(req.Audience))
	if kind == "" {
		kind = audienceCustomer
	}
	cookieName := customerCookieName
	if kind == audienceStaff {
		cookieName = staffCookieName
	}

	if c, err := r.Cookie(cookieName); err == nil && strings.TrimSpace(c.Value) != "" {
		_ = h.q.DeleteSessionByTokenHash(ctx, auth.HashToken(h.sessionSecret, c.Value))
	}
	clearAuthCookie(w, cookieName, secure)
	clearAuthCookie(w, legacyCookieName, secure)

	sid := uuid.NewString()
	maxAge := int((30 * 24 * time.Hour).Seconds())
	http.SetCookie(w, &http.Cookie{
		Name:     guestCookieName,
		Value:    sid,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   maxAge,
	})

	if h.cartSvc != nil && req.ShopID > 0 {
		owner := cartsvc.Owner{SessionID: &sid}
		_, _ = h.cartSvc.GetCart(ctx, owner, req.ShopID)
	}

	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r.Context())
	if !ok {
		httpx.Fail(w, http.StatusUnauthorized, "not_authenticated", nil)
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"id":           user.ID,
		"email":        user.Email,
		"display_name": nullStringAny(user.DisplayName),
		"role":         nullStringAny(user.Role),
		"is_active":    user.IsActive,
		"shop_id":      nullInt64Any(user.ShopID),
		"store_id":     nullInt64Any(user.StoreID),
	})
}

func (h *Handler) GuestSession(w http.ResponseWriter, r *http.Request) {
	secure := h.env != "dev"

	if c, err := r.Cookie(guestCookieName); err == nil {
		if strings.TrimSpace(c.Value) != "" {
			httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
			return
		}
	}

	sid := uuid.NewString()
	maxAge := int((30 * 24 * time.Hour).Seconds())
	http.SetCookie(w, &http.Cookie{
		Name:     guestCookieName,
		Value:    sid,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   maxAge,
	})

	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

type CustomerProfilePayload struct {
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`

	Address1   *string `json:"address1"`
	Address2   *string `json:"address2"`
	PostalCode *string `json:"postal_code"`
	City       *string `json:"city"`
	Country    *string `json:"country"`
	Notes      *string `json:"notes"`
}

func (h *Handler) GetMyCustomer(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r.Context())
	if !ok || user.ID <= 0 {
		httpx.Fail(w, http.StatusUnauthorized, "not_authenticated", nil)
		return
	}

	c, err := h.customers.GetCustomerByUserID(r.Context(), user.ID)
	if err != nil {
		if errors.Is(err, customersvc.ErrNotFound) {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		httpx.ServerError(w, "get_customer_failed", err)
		return
	}

	httpx.JSON(w, http.StatusOK, c)
}

func (h *Handler) UpsertMyCustomer(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r.Context())
	if !ok || user.ID <= 0 {
		httpx.Fail(w, http.StatusUnauthorized, "not_authenticated", nil)
		return
	}

	var req CustomerProfilePayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
		return
	}

	req.Email = strings.TrimSpace(req.Email)
	req.Phone = strings.TrimSpace(req.Phone)
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)

	if req.Email == "" {
		httpx.Fail(w, http.StatusBadRequest, "email_required", nil)
		return
	}
	if req.FirstName == "" || req.LastName == "" {
		httpx.Fail(w, http.StatusBadRequest, "name_required", nil)
		return
	}

	address1 := u.TrimOrNil(req.Address1)
	address2 := u.TrimOrNil(req.Address2)
	postal := u.TrimOrNil(req.PostalCode)
	city := u.TrimOrNil(req.City)
	country := u.TrimOrNil(req.Country)
	notes := u.TrimOrNil(req.Notes)

	existing, err := h.customers.GetCustomerByUserID(r.Context(), user.ID)
	if err != nil && !errors.Is(err, customersvc.ErrNotFound) {
		httpx.ServerError(w, "get_customer_failed", err)
		return
	}

	if errors.Is(err, customersvc.ErrNotFound) {
		if !user.ShopID.Valid || user.ShopID.Int64 <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "shop_id_missing", nil)
			return
		}
		shopID := user.ShopID.Int64

		item, err := h.customers.Create(r.Context(), customersvc.CreateInput{
			ShopID:     shopID,
			UserID:     &user.ID,
			Email:      &req.Email,
			Phone:      &req.Phone,
			FirstName:  &req.FirstName,
			LastName:   &req.LastName,
			Address1:   address1,
			Address2:   address2,
			PostalCode: postal,
			City:       city,
			Country:    country,
			Notes:      notes,
			IsActive:   ptrBool(true),
		})
		if err != nil {
			httpx.ServerError(w, "create_customer_failed", err)
			return
		}

		httpx.JSON(w, http.StatusOK, item)
		return
	}

	item, err := h.customers.Update(r.Context(), customersvc.UpdateInput{
		ID:         existing.ID,
		Email:      &req.Email,
		Phone:      &req.Phone,
		FirstName:  &req.FirstName,
		LastName:   &req.LastName,
		Address1:   address1,
		Address2:   address2,
		PostalCode: postal,
		City:       city,
		Country:    country,
		Notes:      notes,
		IsActive:   nil,
	})
	if err != nil {
		httpx.ServerError(w, "update_customer_failed", err)
		return
	}

	httpx.JSON(w, http.StatusOK, item)
}

func ptrBool(v bool) *bool { return &v }

func nullStringAny(ns sql.NullString) any {
	if ns.Valid {
		return ns.String
	}
	return nil
}

func nullInt64Any(ni sql.NullInt64) any {
	if ni.Valid {
		return ni.Int64
	}
	return nil
}

func isPostgresFKViolation(err error) bool {
	var pg *pgconn.PgError
	if errors.As(err, &pg) && pg.Code == "23503" {
		return true
	}
	s := err.Error()
	return strings.Contains(s, "23503") || strings.Contains(s, "foreign key constraint")
}

func isPostgresUniqueViolation(err error) bool {
	var pg *pgconn.PgError
	if errors.As(err, &pg) && pg.Code == "23505" {
		return true
	}
	return strings.Contains(err.Error(), "23505") || strings.Contains(err.Error(), "unique constraint")
}
