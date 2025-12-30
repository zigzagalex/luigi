package authv1

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

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
	users *usersvc.Service
}

func RegisterRoutes(r chi.Router, fb *fbauth.Client, q db.Querier, env string) {
	us := usersvc.NewService(q)
	h := &Handler{fb: fb, env: env, users: us}

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
}

func (h *Handler) CreateSession(w http.ResponseWriter, r *http.Request) {
	var req createSessionReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.IDToken) == "" {
		httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
		return
	}

	// (Recommended) verify ID token first to get UID/email for provisioning
	tok, err := h.fb.VerifyIDToken(r.Context(), req.IDToken)
	if err != nil {
		httpx.Fail(w, http.StatusUnauthorized, "invalid_id_token", err.Error())
		return
	}

	uid := strings.TrimSpace(tok.UID)
	if uid == "" {
		httpx.Fail(w, http.StatusUnauthorized, "missing_uid", nil)
		return
	}

	// Optional: auto-provision the Postgres user on first login.
	// If you don’t want auto-provision, delete this block and return 403 later instead.
	_, err = h.users.GetUserByFirebaseUID(r.Context(), uid)
	if err != nil {
		if err == usersvc.ErrNotFound {
			var emailPtr *string
			if v, ok := tok.Claims["email"].(string); ok {
				e := strings.TrimSpace(v)
				if e != "" {
					emailPtr = &e
				}
			}

			uidCopy := uid
			_, createErr := h.users.Create(r.Context(), usersvc.CreateInput{
				FirebaseUID: &uidCopy,
				Email:       emailPtr,	
			})
			if createErr != nil {
				httpx.Fail(w, http.StatusInternalServerError, "user_autoprovision_failed", createErr.Error())
				return
			}
		} else {
			httpx.Fail(w, http.StatusInternalServerError, "get_user_failed", err.Error())
			return
		}
	}

	// Create session cookie (5min..14 days supported)
	expiresIn := 7 * 24 * time.Hour
	sessionCookie, err := h.fb.SessionCookie(r.Context(), req.IDToken, expiresIn)
	if err != nil {
		httpx.Fail(w, http.StatusUnauthorized, "session_cookie_create_failed", err.Error())
		return
	}

	secure := h.env != "dev" // local http needs Secure=false or browser may ignore
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

	// Return a SAFE shape (don’t dump everything)
	httpx.JSON(w, http.StatusOK, map[string]any{
		"id":           user.ID,
		"email":        user.Email,
		"display_name": user.DisplayName,
		"role":         user.Role,
		"shop_id":      user.ShopID,
		"store_id":     user.StoreID,
	})
}
