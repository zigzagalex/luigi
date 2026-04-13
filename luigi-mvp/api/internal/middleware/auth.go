package middleware

import (
	"context"
	"errors"
	"net/http"
	"strings"

	fbauth "firebase.google.com/go/v4/auth"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	usersvc "github.com/zigzagalex/luigi/api/internal/users"
)

type ctxKey string

const userKey ctxKey = "auth_user"

func UserFromContext(ctx context.Context) (db.User, bool) {
	v := ctx.Value(userKey)
	if v == nil {
		return db.User{}, false
	}
	u, ok := v.(db.User)
	return u, ok
}

func roleString(u db.User) string {
	if !u.Role.Valid {
		return ""
	}
	return strings.ToLower(strings.TrimSpace(u.Role.String))
}

// RequireStaffOrAdmin expects the authenticated user in context (e.g. after RequireSessionCookie).
func RequireStaffOrAdmin() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			u, ok := UserFromContext(r.Context())
			if !ok {
				httpx.Fail(w, http.StatusUnauthorized, "not_authenticated", nil)
				return
			}
			switch roleString(u) {
			case "admin", "staff":
				next.ServeHTTP(w, r)
			default:
				httpx.Fail(w, http.StatusForbidden, "staff_or_admin_required", nil)
			}
		})
	}
}

// RequireAdmin expects the authenticated user in context.
func RequireAdmin() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			u, ok := UserFromContext(r.Context())
			if !ok {
				httpx.Fail(w, http.StatusUnauthorized, "not_authenticated", nil)
				return
			}
			if roleString(u) != "admin" {
				httpx.Fail(w, http.StatusForbidden, "admin_required", nil)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// IsStaffOrAdmin reports whether the DB user may use management APIs.
func IsStaffOrAdmin(u db.User) bool {
	switch roleString(u) {
	case "admin", "staff":
		return true
	default:
		return false
	}
}

// IsAdmin reports whether the DB user may perform destructive user management.
func IsAdmin(u db.User) bool {
	return roleString(u) == "admin"
}

func RequireSessionCookie(fb *fbauth.Client, users *usersvc.Service, cookieName string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			c, err := r.Cookie(cookieName)
			if err != nil || c.Value == "" {
				httpx.Fail(w, http.StatusUnauthorized, "missing_session", nil)
				return
			}

			// Verify Firebase session cookie (NOT an ID token)
			tok, err := fb.VerifySessionCookie(r.Context(), c.Value)
			if err != nil {
				httpx.Fail(w, http.StatusUnauthorized, "invalid_session", err.Error())
				return
			}

			// Map Firebase UID -> your Postgres user
			user, err := users.GetUserByFirebaseUID(r.Context(), tok.UID)
			if err != nil {
				if errors.Is(err, usersvc.ErrNotFound) {
					httpx.Fail(w, http.StatusForbidden, "user_not_provisioned", nil)
					return
				}
				httpx.Fail(w, http.StatusInternalServerError, "get_user_failed", err.Error())
				return
			}

			ctx := context.WithValue(r.Context(), userKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}


// OptionalSessionCookie is like RequireSessionCookie, but it NEVER blocks the request.
// If a valid session cookie is present -> it injects the user into context.
// If missing/invalid -> it does nothing and the request continues as guest.
func OptionalSessionCookie(fb *fbauth.Client, us *usersvc.Service, cookieName string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// If no cookie -> guest 
			c, err := r.Cookie(cookieName)
			if err != nil || strings.TrimSpace(c.Value) == "" {
				next.ServeHTTP(w, r)
				return
			}

			// Verify session cookie (Firebase)
			tok, err := fb.VerifySessionCookie(r.Context(), c.Value)
			if err != nil {
				// Reset invalid cookie to avoid verification cost
				http.SetCookie(w, &http.Cookie{
					Name:     cookieName,
					Value:    "",
					Path:     "/",
					HttpOnly: true,
					Secure:   true, // or whatever you use depending on env
					SameSite: http.SameSiteLaxMode,
					MaxAge:   -1,
				})
			
				next.ServeHTTP(w, r)
				return
			}

			uid := strings.TrimSpace(tok.UID)
			if uid == "" {
				next.ServeHTTP(w, r)
				return
			}

			// Resolve your internal user by Firebase UID
			user, err := us.GetUserByFirebaseUID(r.Context(), uid)
			if err != nil {
				// can't map to internal user -> treat as guest
				next.ServeHTTP(w, r)
				return
			}

			// Inject user into request context 
			ctx := context.WithValue(r.Context(), userKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}