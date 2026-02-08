package authv1

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	customersvc "github.com/zigzagalex/luigi/api/internal/customers"

	fbauth "firebase.google.com/go/v4/auth"
	"github.com/go-chi/chi/v5"
	avsvc "github.com/zigzagalex/luigi/api/internal/availability"
	cartsvc "github.com/zigzagalex/luigi/api/internal/cart"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	"github.com/zigzagalex/luigi/api/internal/middleware"
	usersvc "github.com/zigzagalex/luigi/api/internal/users"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

const cookieName = "luigi_session"
const guestCookieName = "luigi_guest"

type Handler struct {
	fb      *fbauth.Client
	env     string
	q       *db.Queries
	db      *sql.DB
	users   *usersvc.Service
	cartSvc *cartsvc.Service

	customers *customersvc.Service // NEW
}

func RegisterRoutes(r chi.Router, fb *fbauth.Client, q *db.Queries, sqlDB *sql.DB, env string, av *avsvc.Service) {
	us := usersvc.NewService(q)

	cartSvc := cartsvc.NewService(q, sqlDB, av)
	cs := customersvc.NewService(q)

	h := &Handler{
		fb:        fb,
		env:       env,
		q:         q,
		db:        sqlDB,
		users:     us,
		cartSvc:   cartSvc,
		customers: cs,
	}

	// -------------------------
	// Public auth endpoints
	// -------------------------
	r.Route("/auth", func(r chi.Router) {
		r.Post("/guest", h.GuestSession)
		r.Post("/session", h.CreateSession)
		r.Post("/logout", h.Logout)

		// Protected endpoints (must have valid session cookie)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireSessionCookie(fb, us, cookieName))
			r.Get("/me", h.Me)
		})
	})

	// -------------------------
	// Protected "me" endpoints (NOT under /auth)
	// so the path is /me/customer rather than /auth/me/customer
	// -------------------------
	r.Group(func(r chi.Router) {
		r.Use(middleware.RequireSessionCookie(fb, us, cookieName))
		r.Get("/me/customer", h.GetMyCustomer)
		r.Put("/me/customer", h.UpsertMyCustomer)
	})
}

type createSessionReq struct {
	IDToken string `json:"idToken"`

	// provisioning fields (only used if user doesn't exist)
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

type logoutReq struct {
	ShopID int64 `json:"shop_id"`
}

func (h *Handler) CreateSession(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req createSessionReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.IDToken) == "" {
		httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
		return
	}

	// 1) Verify Firebase ID token (proves identity)
	tok, err := h.fb.VerifyIDToken(ctx, req.IDToken)
	if err != nil {
		httpx.Fail(w, http.StatusUnauthorized, "invalid_id_token", err.Error())
		return
	}

	uid := strings.TrimSpace(tok.UID)
	if uid == "" {
		httpx.Fail(w, http.StatusUnauthorized, "missing_uid", nil)
		return
	}

	// Pull email from token claims (required for your flow)
	var emailPtr *string
	if v, ok := tok.Claims["email"].(string); ok {
		e := strings.TrimSpace(v)
		if e != "" {
			emailPtr = &e
		}
	}
	if emailPtr == nil {
		httpx.Fail(w, http.StatusBadRequest, "email_missing", "firebase token has no email claim")
		return
	}

	// 2) Transaction: ensure BOTH user + customer exist (atomic)
	tx, err := h.db.BeginTx(ctx, nil)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "tx_begin_failed", err.Error())
		return
	}
	defer tx.Rollback()

	qtx := h.q.WithTx(tx)
	us := usersvc.NewService(qtx)
	cs := customersvc.NewService(qtx)

	// 2a) Ensure user exists
	user, err := us.GetUserByFirebaseUID(ctx, uid)
	if err != nil {
		if err != usersvc.ErrNotFound {
			httpx.Fail(w, http.StatusInternalServerError, "get_user_failed", err.Error())
			return
		}

		// provisioning required
		if req.ShopID <= 0 ||
			strings.TrimSpace(req.FirstName) == "" ||
			strings.TrimSpace(req.LastName) == "" ||
			strings.TrimSpace(req.Phone) == "" {
			httpx.Fail(w, http.StatusBadRequest, "missing_profile_fields", map[string]any{
				"shop_id":    req.ShopID,
				"first_name": req.FirstName,
				"last_name":  req.LastName,
				"phone":      req.Phone,
				"email":      *emailPtr,
			})
			return
		}

		uidCopy := uid
		display := strings.TrimSpace(req.FirstName) + " " + strings.TrimSpace(req.LastName)

		user, err = us.Create(ctx, usersvc.CreateInput{
			ShopID:      &req.ShopID,
			FirebaseUID: &uidCopy,
			Email:       emailPtr,
			DisplayName: &display,
		})
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "user_autoprovision_failed", err.Error())
			return
		}
	}

	// Choose shop_id for customer creation:
	// - prefer request (frontend sends it)
	// - otherwise fallback to user's shop_id
	shopID := req.ShopID
	if shopID <= 0 {
		if user.ShopID.Valid {
			shopID = user.ShopID.Int64
		}
	}

	// 2b) Ensure customer exists for this user
	_, err = cs.GetCustomerByUserID(ctx, user.ID)
	if err != nil {
		if err != customersvc.ErrNotFound {
			httpx.Fail(w, http.StatusInternalServerError, "get_customer_failed", err.Error())
			return
		}

		// provisioning customer profile (strict fields)
		if shopID <= 0 ||
			strings.TrimSpace(req.FirstName) == "" ||
			strings.TrimSpace(req.LastName) == "" ||
			strings.TrimSpace(req.Phone) == "" {
			httpx.Fail(w, http.StatusBadRequest, "missing_profile_fields", map[string]any{
				"shop_id":    shopID,
				"first_name": req.FirstName,
				"last_name":  req.LastName,
				"phone":      req.Phone,
			})
			return
		}

		_, err = cs.Create(ctx, customersvc.CreateInput{
			ShopID:    shopID,
			UserID:    &user.ID,
			Email:     emailPtr,
			Phone:     ptr(strings.TrimSpace(req.Phone)),
			FirstName: ptr(strings.TrimSpace(req.FirstName)),
			LastName:  ptr(strings.TrimSpace(req.LastName)),
			// address fields optional for now => leave nil
			IsActive: ptrBool(true),
		})
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "customer_autoprovision_failed", err.Error())
			return
		}
	}

	// 2c) Commit DB work first
	if err := tx.Commit(); err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "tx_commit_failed", err.Error())
		return
	}

	// 3) Create Firebase session cookie AFTER DB is consistent
	expiresIn := 7 * 24 * time.Hour
	sessionCookie, err := h.fb.SessionCookie(ctx, req.IDToken, expiresIn)
	if err != nil {
		httpx.Fail(w, http.StatusUnauthorized, "session_cookie_create_failed", err.Error())
		return
	}

	secure := h.env != "dev"
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    sessionCookie,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(expiresIn.Seconds()),
	})

	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func ptr(s string) *string { return &s }
func ptrBool(v bool) *bool { return &v }

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	secure := h.env != "dev"

	// Optional body: { "shop_id": 1 }
	var req logoutReq
	_ = json.NewDecoder(r.Body).Decode(&req)

	// 1) Clear auth cookie
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})

	// 2) Rotate guest cookie (fresh identity => empty cart)
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

	// 3) Optional warm-up: create empty guest cart now
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
		"email":        nullStringAny(user.Email),
		"display_name": nullStringAny(user.DisplayName),
		"role":         nullStringAny(user.Role),
		"shop_id":      nullInt64Any(user.ShopID),
		"store_id":     nullInt64Any(user.StoreID),
	})
}

func (h *Handler) GuestSession(w http.ResponseWriter, r *http.Request) {
	secure := h.env != "dev"

	// If already present, no-op
	if c, err := r.Cookie(guestCookieName); err == nil {
		if strings.TrimSpace(c.Value) != "" {
			httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
			return
		}
	}

	// Create new guest session id
	sid := uuid.NewString()

	// Keep guest sessions reasonably long-lived (e.g., 30 days)
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

// -------------------------
// /me/customer (profile)
// -------------------------

// Public contract for "my customer profile".
// No IDs, no shop_id, no user_id, no is_active.
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
		if err == customersvc.ErrNotFound {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		httpx.Fail(w, http.StatusInternalServerError, "get_customer_failed", err.Error())
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

	// Normalize required fields
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

	// Optional fields: treat "" as nil
	address1 := u.TrimOrNil(req.Address1)
	address2 := u.TrimOrNil(req.Address2)
	postal := u.TrimOrNil(req.PostalCode)
	city := u.TrimOrNil(req.City)
	country := u.TrimOrNil(req.Country)
	notes := u.TrimOrNil(req.Notes)

	// Try load existing customer by user_id
	existing, err := h.customers.GetCustomerByUserID(r.Context(), user.ID)
	if err != nil && err != customersvc.ErrNotFound {
		httpx.Fail(w, http.StatusInternalServerError, "get_customer_failed", err.Error())
		return
	}

	// Create if missing
	if err == customersvc.ErrNotFound {
		if !user.ShopID.Valid || user.ShopID.Int64 <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "shop_id_missing", nil)
			return
		}
		shopID := user.ShopID.Int64

		item, err := h.customers.Create(r.Context(), customersvc.CreateInput{
			ShopID: shopID,
			UserID: &user.ID,

			Email:     &req.Email,
			Phone:     &req.Phone,
			FirstName: &req.FirstName,
			LastName:  &req.LastName,

			Address1:   address1,
			Address2:   address2,
			PostalCode: postal,
			City:       city,
			Country:    country,
			Notes:      notes,

			IsActive: ptrBool(true),
		})
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "create_customer_failed", err.Error())
			return
		}

		httpx.JSON(w, http.StatusOK, item)
		return
	}

	// Update existing
	//
	// IMPORTANT:
	// This requires your customers service UpdateInput + Update() to include address fields,
	// since your SQL UpdateCustomer supports them.
	item, err := h.customers.Update(r.Context(), customersvc.UpdateInput{
		ID: existing.ID,

		Email:     &req.Email,
		Phone:     &req.Phone,
		FirstName: &req.FirstName,
		LastName:  &req.LastName,

		Address1:   address1,
		Address2:   address2,
		PostalCode: postal,
		City:       city,
		Country:    country,

		Notes:    notes,
		IsActive: nil,
	})
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "update_customer_failed", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, item)
}

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
