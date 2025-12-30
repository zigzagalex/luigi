package authv1

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	customersvc "github.com/zigzagalex/luigi/api/internal/customers"

	fbauth "firebase.google.com/go/v4/auth"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	"github.com/zigzagalex/luigi/api/internal/middleware"
	usersvc "github.com/zigzagalex/luigi/api/internal/users"

	"github.com/go-chi/chi/v5"
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

	// 1) Verify Firebase ID token (proves user identity)
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

	// Pull email from token claims (if present)
	var emailPtr *string
	if v, ok := tok.Claims["email"].(string); ok {
		e := strings.TrimSpace(v)
		if e != "" {
			emailPtr = &e
		}
	}

	// 2) Transaction: ensure BOTH user + customer exist, atomically.
	// Why: without a tx you can create a user but fail customer creation and end up with broken state.
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
		if err == usersvc.ErrNotFound {
			// First time we've seen this Firebase UID => provisioning is required.
			// Enforce the profile fields YOU said must exist.
			if req.ShopID <= 0 ||
				strings.TrimSpace(req.FirstName) == "" ||
				strings.TrimSpace(req.LastName) == "" ||
				strings.TrimSpace(req.Phone) == "" ||
				strings.TrimSpace(req.Address1) == "" ||
				strings.TrimSpace(req.PostalCode) == "" ||
				strings.TrimSpace(req.City) == "" {
				httpx.Fail(w, http.StatusBadRequest, "missing_profile_fields", map[string]any{
					"shop_id":     req.ShopID,
					"first_name":  req.FirstName,
					"last_name":   req.LastName,
					"phone":       req.Phone,
					"address1":    req.Address1,
					"postal_code": req.PostalCode,
					"city":        req.City,
					"country":     req.Country,
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
				// Role + IsActive can default in service/SQL to "customer" + true
			})
			if err != nil {
				httpx.Fail(w, http.StatusInternalServerError, "user_autoprovision_failed", err.Error())
				return
			}
		} else {
			httpx.Fail(w, http.StatusInternalServerError, "get_user_failed", err.Error())
			return
		}
	}

	// 2b) Ensure customer profile exists for this user
	// - customers.GetCustomerByUserID(ctx, user.ID)
	// - customers.Create(...) that takes UserID + address fields
	_, err = cs.GetCustomerByUserID(ctx, user.ID)
	if err != nil {
		if err == customersvc.ErrNotFound {
			// If user existed already but customer missing, either:
			// - require fields and create now (strict)
			// - or create a minimal customer and force completion later (looser)
			// You said you want strict.
			if strings.TrimSpace(req.FirstName) == "" ||
				strings.TrimSpace(req.LastName) == "" ||
				strings.TrimSpace(req.Phone) == "" {
				httpx.Fail(w, http.StatusBadRequest, "missing_profile_fields", "customer profile required")
				return
			}

			country := strings.TrimSpace(req.Country)
			if country == "" {
				country = "CH"
			}

			_, err = cs.Create(ctx, customersvc.CreateInput{
				ShopID:     req.ShopID, // or derive from user.ShopID if you enforce it
				UserID:     &user.ID,
				Email:      emailPtr,
				Phone:      ptr(strings.TrimSpace(req.Phone)),
				FirstName:  ptr(strings.TrimSpace(req.FirstName)),
				LastName:   ptr(strings.TrimSpace(req.LastName)),
				Address1:   optPtr(strings.TrimSpace(req.Address1)),
				Address2:   optPtr(req.Address2),
				PostalCode: optPtr(strings.TrimSpace(req.PostalCode)),
				City:       optPtr(strings.TrimSpace(req.City)),
				Country:    optPtr(country),
				IsActive:   ptrBool(true),
			})
			if err != nil {
				httpx.Fail(w, http.StatusInternalServerError, "customer_autoprovision_failed", err.Error())
				return
			}
		} else {
			httpx.Fail(w, http.StatusInternalServerError, "get_customer_failed", err.Error())
			return
		}
	}

	// 2c) Commit DB work FIRST (so cookie isn't created for a half-provisioned user)
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

func optPtr(s string) *string {
	t := strings.TrimSpace(s)
	if t == "" {
		return nil
	}
	return &t
}

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
		"display_name": user.DisplayName,
		"role":         user.Role,
		"shop_id":      user.ShopID,
		"store_id":     user.StoreID,
	})
}
