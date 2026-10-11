package usersv1

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/zigzagalex/luigi/api/internal/auth"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	"github.com/zigzagalex/luigi/api/internal/middleware"
	usersvc "github.com/zigzagalex/luigi/api/internal/users"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

func RegisterRoutes(r chi.Router, q db.Querier) {
	svc := usersvc.NewService(q)

	r.Route("/users", func(r chi.Router) {
		r.Get("/", listHandler(svc))
		r.With(middleware.RequireAdmin()).Post("/", createHandler(svc))
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
		httpx.JSON(w, http.StatusOK, sanitizeUsers(items))
	}
}

type createReq struct {
	ShopID      *int64  `json:"shop_id"`
	StoreID     *int64  `json:"store_id"`
	Email       *string `json:"email"`
	Phone       *string `json:"phone"`
	DisplayName *string `json:"display_name"`
	Password    *string `json:"password"`
	FirstName   *string `json:"first_name"`
	LastName    *string `json:"last_name"`
	Role        *string `json:"role"`
	IsActive    *bool   `json:"is_active"`
}

func createHandler(svc *usersvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}

		ctx := r.Context()
		email := strings.TrimSpace(ptrStr(req.Email))
		if email == "" {
			httpx.Fail(w, http.StatusBadRequest, "email_required", nil)
			return
		}
		if req.Password == nil || strings.TrimSpace(*req.Password) == "" {
			httpx.Fail(w, http.StatusBadRequest, "password_required", nil)
			return
		}
		if req.ShopID == nil || *req.ShopID <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "shop_id_required", nil)
			return
		}

		fn := strings.TrimSpace(ptrStr(req.FirstName))
		ln := strings.TrimSpace(ptrStr(req.LastName))
		ph := strings.TrimSpace(ptrStr(req.Phone))
		display := strings.TrimSpace(ptrStr(req.DisplayName))
		if display == "" && fn != "" && ln != "" {
			display = fn + " " + ln
		}

		roleStr := strings.ToLower(strings.TrimSpace(ptrStr(req.Role)))
		if roleStr == "" {
			roleStr = "customer"
		}
		if roleStr != "admin" && roleStr != "staff" && roleStr != "customer" {
			httpx.Fail(w, http.StatusBadRequest, "invalid_role", nil)
			return
		}
		// Staff/admin still need a usable profile when created from admin UI.
		if roleStr == "admin" || roleStr == "staff" {
			if fn == "" || ln == "" || ph == "" {
				httpx.Fail(w, http.StatusBadRequest, "missing_profile_fields", map[string]any{
					"first_name": fn,
					"last_name":  ln,
					"phone":      ph,
				})
				return
			}
			if display == "" {
				display = fn + " " + ln
			}
		}

		hash, err := auth.HashPassword(strings.TrimSpace(*req.Password))
		if err != nil {
			if errors.Is(err, auth.ErrWeakPassword) {
				httpx.Fail(w, http.StatusBadRequest, "weak_password", err.Error())
				return
			}
			httpx.Fail(w, http.StatusInternalServerError, "hash_password_failed", nil)
			return
		}

		item, err := svc.Create(ctx, usersvc.CreateInput{
			ShopID:       req.ShopID,
			StoreID:      req.StoreID,
			Email:        email,
			Phone:        u.TrimOrNil(&ph),
			DisplayName:  u.TrimOrNil(&display),
			PasswordHash: hash,
			Role:         &roleStr,
			IsActive:     req.IsActive,
		})
		if err != nil {
			log.Printf("create user: postgres insert failed: %v", err)
			if isPostgresFKViolation(err) {
				httpx.Fail(w, http.StatusBadRequest, "shop_id_not_found", nil)
				return
			}
			if isPostgresUniqueViolation(err) {
				httpx.Fail(w, http.StatusConflict, "email_already_exists", nil)
				return
			}
			httpx.Fail(w, http.StatusInternalServerError, "create_user_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, sanitizeUser(item))
	}
}

func ptrStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
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
	Phone       *string `json:"phone"`
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
			Phone:       u.TrimOrNil(req.Phone),
			DisplayName: u.TrimOrNil(req.DisplayName),
			Role:        u.TrimOrNil(req.Role),
			IsActive:    req.IsActive,
		})
		if err != nil {
			if errors.Is(err, usersvc.ErrNotFound) {
				httpx.Fail(w, http.StatusNotFound, "user_not_found", nil)
				return
			}
			log.Printf("update_user_failed id=%d: %v", id, err)
			httpx.Fail(w, http.StatusInternalServerError, "update_user_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, sanitizeUser(item))
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
			if errors.Is(err, usersvc.ErrNotFound) {
				httpx.Fail(w, http.StatusNotFound, "user_not_found", nil)
				return
			}
			log.Printf("delete_user_failed id=%d: %v", id, err)
			httpx.Fail(w, http.StatusInternalServerError, "delete_user_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, sanitizeUser(item))
	}
}

type userResponse struct {
	ID          int64   `json:"id"`
	ShopID      *int64  `json:"shop_id"`
	StoreID     *int64  `json:"store_id"`
	Email       string  `json:"email"`
	Phone       *string `json:"phone"`
	DisplayName *string `json:"display_name"`
	Role        *string `json:"role"`
	IsActive    bool    `json:"is_active"`
	CreatedAt   any     `json:"created_at"`
	UpdatedAt   any     `json:"updated_at"`
}

func sanitizeUser(u db.User) userResponse {
	return userResponse{
		ID:          u.ID,
		ShopID:      nullInt64Ptr(u.ShopID),
		StoreID:     nullInt64Ptr(u.StoreID),
		Email:       u.Email,
		Phone:       nullStringPtr(u.Phone),
		DisplayName: nullStringPtr(u.DisplayName),
		Role:        nullStringPtr(u.Role),
		IsActive:    u.IsActive,
		CreatedAt:   u.CreatedAt,
		UpdatedAt:   u.UpdatedAt,
	}
}

func sanitizeUsers(users []db.User) []userResponse {
	out := make([]userResponse, 0, len(users))
	for _, u := range users {
		out = append(out, sanitizeUser(u))
	}
	return out
}

func nullStringPtr(ns sql.NullString) *string {
	if !ns.Valid {
		return nil
	}
	s := ns.String
	return &s
}

func nullInt64Ptr(ni sql.NullInt64) *int64 {
	if !ni.Valid {
		return nil
	}
	v := ni.Int64
	return &v
}
