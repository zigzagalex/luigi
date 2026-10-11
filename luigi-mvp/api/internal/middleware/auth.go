package middleware

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/zigzagalex/luigi/api/internal/auth"
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

type sessionQuerier interface {
	GetSessionByTokenHash(ctx context.Context, tokenHash string) (db.Session, error)
}

func resolveSessionUser(
	ctx context.Context,
	sessionSecret string,
	q sessionQuerier,
	users *usersvc.Service,
	token string,
) (db.User, error) {
	hash := auth.HashToken(sessionSecret, token)
	sess, err := q.GetSessionByTokenHash(ctx, hash)
	if err != nil {
		return db.User{}, err
	}
	user, err := users.GetByID(ctx, sess.UserID)
	if err != nil {
		return db.User{}, err
	}
	return user, nil
}

func clearSessionCookie(w http.ResponseWriter, cookieName string, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}

func RequireSessionCookie(
	sessionSecret string,
	q sessionQuerier,
	users *usersvc.Service,
	cookieName string,
) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			c, err := r.Cookie(cookieName)
			if err != nil || strings.TrimSpace(c.Value) == "" {
				httpx.Fail(w, http.StatusUnauthorized, "missing_session", nil)
				return
			}

			user, err := resolveSessionUser(r.Context(), sessionSecret, q, users, c.Value)
			if err != nil {
				if errors.Is(err, usersvc.ErrNotFound) {
					httpx.Fail(w, http.StatusForbidden, "user_not_provisioned", nil)
					return
				}
				httpx.Fail(w, http.StatusUnauthorized, "invalid_session", nil)
				return
			}
			if !user.IsActive {
				httpx.Fail(w, http.StatusForbidden, "user_inactive", nil)
				return
			}

			ctx := context.WithValue(r.Context(), userKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireAudienceSessionCookie picks luigi_staff or luigi_customer from ?audience= / X-Luigi-Audience.
// Default is the customer cookie so the shop keeps working without a header.
func RequireAudienceSessionCookie(
	sessionSecret string,
	q sessionQuerier,
	users *usersvc.Service,
	customerCookie string,
	staffCookie string,
) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			audience := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("audience")))
			if audience == "" {
				audience = strings.ToLower(strings.TrimSpace(r.Header.Get("X-Luigi-Audience")))
			}
			cookieName := customerCookie
			if audience == "staff" {
				cookieName = staffCookie
			}
			c, err := r.Cookie(cookieName)
			if err != nil || strings.TrimSpace(c.Value) == "" {
				httpx.Fail(w, http.StatusUnauthorized, "missing_session", nil)
				return
			}

			user, err := resolveSessionUser(r.Context(), sessionSecret, q, users, c.Value)
			if err != nil {
				if errors.Is(err, usersvc.ErrNotFound) {
					httpx.Fail(w, http.StatusForbidden, "user_not_provisioned", nil)
					return
				}
				httpx.Fail(w, http.StatusUnauthorized, "invalid_session", nil)
				return
			}
			if !user.IsActive {
				httpx.Fail(w, http.StatusForbidden, "user_inactive", nil)
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
func OptionalSessionCookie(
	sessionSecret string,
	q sessionQuerier,
	us *usersvc.Service,
	cookieName string,
	secure bool,
) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			c, err := r.Cookie(cookieName)
			if err != nil || strings.TrimSpace(c.Value) == "" {
				next.ServeHTTP(w, r)
				return
			}

			user, err := resolveSessionUser(r.Context(), sessionSecret, q, us, c.Value)
			if err != nil || !user.IsActive {
				clearSessionCookie(w, cookieName, secure)
				next.ServeHTTP(w, r)
				return
			}

			ctx := context.WithValue(r.Context(), userKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
