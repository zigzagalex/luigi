package middleware

import (
	"context"
	"errors"
	"net/http"

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
