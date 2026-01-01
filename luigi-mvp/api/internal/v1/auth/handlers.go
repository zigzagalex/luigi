package authv1

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	customersvc "github.com/zigzagalex/luigi/api/internal/customers"

	fbauth "firebase.google.com/go/v4/auth"
	"github.com/go-chi/chi/v5"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	"github.com/zigzagalex/luigi/api/internal/middleware"
	usersvc "github.com/zigzagalex/luigi/api/internal/users"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

const cookieName = "luigi_session"

type Handler struct {
	fb    *fbauth.Client
	env   string
	q     *db.Queries
	db    *sql.DB
	users *usersvc.Service
}

func RegisterRoutes(r chi.Router, fb *fbauth.Client, q *db.Queries, sqlDB *sql.DB, env string) {
	us := usersvc.NewService(q)
	h := &Handler{fb: fb, env: env, q: q, db: sqlDB}

	r.Route("/auth", func(r chi.Router) {
		// Public endpoints
		r.Post("/session", h.CreateSession)
		r.Post("/logout", h.Logout)

		// Protected endpoints (must have valid session cookie)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireSessionCookie(fb, us, cookieName))
			r.Get("/me", h.Me)
		})
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
	// - prefer request (your frontend sends it)
	// - otherwise fallback to user's shop_id if you have it
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
	secure := h.env != "dev"

	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})

	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r.Context())
	if !ok {
		httpx.Fail(w, http.StatusUnauthorized, "not_authenticated", nil)
		return
	}

	// Return a SAFE shape
	httpx.JSON(w, http.StatusOK, map[string]any{
		"id":           user.ID,
		"email":        user.Email,
		"display_name": u.NullStringPtr(user.DisplayName),
		"role":         u.NullStringPtr(user.Role),
		"shop_id":      user.ShopID,
		"store_id":     user.StoreID,
	})
}
