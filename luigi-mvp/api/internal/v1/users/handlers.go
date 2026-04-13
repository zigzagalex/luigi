package usersv1

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	fbauth "firebase.google.com/go/v4/auth"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/go-chi/chi/v5"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	"github.com/zigzagalex/luigi/api/internal/middleware"
	usersvc "github.com/zigzagalex/luigi/api/internal/users"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

func RegisterRoutes(r chi.Router, q db.Querier, fb *fbauth.Client) {
	svc := usersvc.NewService(q)

	r.Route("/users", func(r chi.Router) {
		r.Get("/", listHandler(svc)) // GET /users?limit=&offset=&shop_id=
		r.With(middleware.RequireAdmin()).Post("/", createHandler(svc, fb))
		r.With(middleware.RequireAdmin()).Put("/{userID}", updateHandler(svc))
		r.With(middleware.RequireAdmin()).Delete("/{userID}", deleteHandler(svc))
	})
}

func listHandler(svc *usersvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

		var shopIDPtr *int64
		if s := strings.TrimSpace(r.URL.Query().Get("shop_id")); s != "" {
			v, err := strconv.ParseInt(s, 10, 64)
			if err != nil || v <= 0 {
				httpx.Fail(w, http.StatusBadRequest, "invalid_shop_id", nil)
				return
			}
			shopIDPtr = &v
		}

		items, err := svc.List(r.Context(), usersvc.ListInput{
			ShopID: shopIDPtr,
			Limit:  int32(limit),
			Offset: int32(offset),
		})
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "list_users_failed", err.Error())
			return
		}
		if items == nil {
			items = []db.User{}
		}
		httpx.JSON(w, http.StatusOK, items)
	}
}

type createReq struct {
	ShopID      *int64  `json:"shop_id"`
	StoreID     *int64  `json:"store_id"`
	FirebaseUID *string `json:"firebase_uid"`
	Email       *string `json:"email"`
	DisplayName *string `json:"display_name"`
	Password    *string `json:"password"`
	FirstName   *string `json:"first_name"`
	LastName    *string `json:"last_name"`
	Phone       *string `json:"phone"`
	Role        *string `json:"role"`      // optional, defaults to "customer"
	IsActive    *bool   `json:"is_active"` // optional, defaults to true
}

func createHandler(svc *usersvc.Service, fb *fbauth.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}

		ctx := r.Context()
		var firebaseUID *string

		hasPassword := req.Password != nil && strings.TrimSpace(*req.Password) != ""

		if hasPassword {
			if fb == nil {
				httpx.Fail(w, http.StatusServiceUnavailable, "firebase_not_configured", nil)
				return
			}
			if req.ShopID == nil || *req.ShopID <= 0 {
				httpx.Fail(w, http.StatusBadRequest, "shop_id_required", nil)
				return
			}
			email := strings.TrimSpace(ptrStr(req.Email))
			if email == "" {
				httpx.Fail(w, http.StatusBadRequest, "email_required", nil)
				return
			}
			fn := strings.TrimSpace(ptrStr(req.FirstName))
			ln := strings.TrimSpace(ptrStr(req.LastName))
			ph := strings.TrimSpace(ptrStr(req.Phone))
			if fn == "" || ln == "" || ph == "" {
				httpx.Fail(w, http.StatusBadRequest, "missing_profile_fields", map[string]any{
					"first_name": fn,
					"last_name":  ln,
					"phone":      ph,
				})
				return
			}
			roleStr := strings.ToLower(strings.TrimSpace(ptrStr(req.Role)))
			if roleStr != "admin" && roleStr != "staff" {
				httpx.Fail(w, http.StatusBadRequest, "invalid_role_for_provision", nil)
				return
			}
			pw := strings.TrimSpace(*req.Password)
			if len(pw) < 6 {
				httpx.Fail(w, http.StatusBadRequest, "password_too_short", nil)
				return
			}

			display := fn + " " + ln
			params := (&fbauth.UserToCreate{}).
				Email(email).
				Password(pw).
				DisplayName(display)

			rec, err := fb.CreateUser(ctx, params)
			if err != nil {
				if fbauth.IsEmailAlreadyExists(err) {
					httpx.Fail(w, http.StatusConflict, "email_already_exists", nil)
					return
				}
				if fbauth.IsInvalidEmail(err) {
					httpx.Fail(w, http.StatusBadRequest, "invalid_email", nil)
					return
				}
				httpx.Fail(w, http.StatusBadRequest, "firebase_create_failed", err.Error())
				return
			}
			uid := strings.TrimSpace(rec.UID)
			if uid == "" {
				log.Printf("create user: firebase CreateUser returned empty UID (email=%q)", email)
				httpx.Fail(w, http.StatusInternalServerError, "firebase_uid_missing", "Firebase user record had no UID after create")
				return
			}
			uidCopy := uid
			firebaseUID = &uidCopy

			item, err := svc.Create(ctx, usersvc.CreateInput{
				ShopID:      req.ShopID,
				StoreID:     req.StoreID,
				FirebaseUID: firebaseUID,
				Email:       &email,
				DisplayName: &display,
				Role:        &roleStr,
				IsActive:    req.IsActive,
			})
			if err != nil {
				if delErr := fb.DeleteUser(ctx, uid); delErr != nil {
					log.Printf("rollback firebase user failed uid=%s: %v", uid, delErr)
				}
				log.Printf("create user: postgres insert failed: %v", err)
				if isPostgresFKViolation(err) {
					httpx.Fail(w, http.StatusBadRequest, "shop_id_not_found", "insert rejected: shops row missing for shop_id (apply migrations, e.g. 000017_seed_default_shop)")
					return
				}
				if isPostgresUniqueViolation(err) {
					httpx.Fail(w, http.StatusConflict, "user_identifier_conflict", err.Error())
					return
				}
				httpx.Fail(w, http.StatusInternalServerError, "create_user_failed", err.Error())
				return
			}
			httpx.JSON(w, http.StatusOK, item)
			return
		}

		// Manual path: link an existing Firebase account (firebase_uid is required — DB NOT NULL)
		if provisionFieldsPresent(&req) && !hasPassword {
			httpx.Fail(w, http.StatusBadRequest, "password_required", "include a non-empty password field to provision a new Firebase user from this endpoint")
			return
		}

		if (req.Email == nil || strings.TrimSpace(*req.Email) == "") &&
			(req.FirebaseUID == nil || strings.TrimSpace(*req.FirebaseUID) == "") {
			httpx.Fail(w, http.StatusBadRequest, "email_or_firebase_uid_required", nil)
			return
		}

		fu := u.TrimOrNil(req.FirebaseUID)
		if fu == nil {
			httpx.Fail(w, http.StatusBadRequest, "firebase_uid_required", "manual user creation requires firebase_uid (or use password + profile to provision)")
			return
		}

		item, err := svc.Create(ctx, usersvc.CreateInput{
			ShopID:      req.ShopID,
			StoreID:     req.StoreID,
			FirebaseUID: fu,
			Email:       u.TrimOrNil(req.Email),
			DisplayName: u.TrimOrNil(req.DisplayName),
			Role:        u.TrimOrNil(req.Role),
			IsActive:    req.IsActive,
		})
		if err != nil {
			log.Printf("create user (manual): postgres insert failed: %v", err)
			if isPostgresFKViolation(err) {
				httpx.Fail(w, http.StatusBadRequest, "shop_id_not_found", "insert rejected: shops row missing for shop_id")
				return
			}
			if isPostgresUniqueViolation(err) {
				httpx.Fail(w, http.StatusConflict, "user_identifier_conflict", err.Error())
				return
			}
			httpx.Fail(w, http.StatusInternalServerError, "create_user_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}

func ptrStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// provisionFieldsPresent detects shop-style signup payload (first/last/phone) without a password.
func provisionFieldsPresent(req *createReq) bool {
	if req == nil {
		return false
	}
	fn := strings.TrimSpace(ptrStr(req.FirstName))
	ln := strings.TrimSpace(ptrStr(req.LastName))
	ph := strings.TrimSpace(ptrStr(req.Phone))
	return fn != "" || ln != "" || ph != ""
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

type updateReq struct {
	Email       *string `json:"email"`
	DisplayName *string `json:"display_name"`
	Role        *string `json:"role"`
	IsActive    *bool   `json:"is_active"`
}

func updateHandler(svc *usersvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(chi.URLParam(r, "userID"), 10, 64)
		if err != nil || id <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_id", nil)
			return
		}

		var req updateReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}

		item, err := svc.Update(r.Context(), usersvc.UpdateInput{
			ID:          id,
			Email:       u.TrimOrNil(req.Email),
			DisplayName: u.TrimOrNil(req.DisplayName),
			Role:        u.TrimOrNil(req.Role),
			IsActive:    req.IsActive,
		})
		if err != nil {
			if err == usersvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "user_not_found", nil)
				return
			}
			log.Printf("update_user_failed id=%d: %v", id, err)
			httpx.Fail(w, http.StatusInternalServerError, "update_user_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}

func deleteHandler(svc *usersvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(chi.URLParam(r, "userID"), 10, 64)
		if err != nil || id <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_id", nil)
			return
		}

		item, err := svc.Delete(r.Context(), id)
		if err != nil {
			if err == usersvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "user_not_found", nil)
				return
			}
			log.Printf("delete_user_failed id=%d: %v", id, err)
			httpx.Fail(w, http.StatusInternalServerError, "delete_user_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}
