package usersv1

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	"github.com/zigzagalex/luigi/api/internal/middleware"
	usersvc "github.com/zigzagalex/luigi/api/internal/users"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

func RegisterRoutes(r chi.Router, q db.Querier) {
	svc := usersvc.NewService(q)

	r.Route("/users", func(r chi.Router) {
		r.Get("/", listHandler(svc)) // GET /users?limit=&offset=&shop_id=
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
		httpx.JSON(w, http.StatusOK, items)
	}
}

type createReq struct {
	ShopID      *int64  `json:"shop_id"`
	StoreID     *int64  `json:"store_id"`
	FirebaseUID *string `json:"firebase_uid"`
	Email       *string `json:"email"`
	DisplayName *string `json:"display_name"`
	Role        *string `json:"role"`      // optional, defaults to "customer"
	IsActive    *bool   `json:"is_active"` // optional, defaults to true
}

func createHandler(svc *usersvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}
		// Soft validation: require at least one identifier
		if (req.Email == nil || strings.TrimSpace(*req.Email) == "") &&
			(req.FirebaseUID == nil || strings.TrimSpace(*req.FirebaseUID) == "") {
			httpx.Fail(w, http.StatusBadRequest, "email_or_firebase_uid_required", nil)
			return
		}

		item, err := svc.Create(r.Context(), usersvc.CreateInput{
			ShopID:      req.ShopID,
			StoreID:     req.StoreID,
			FirebaseUID: u.TrimOrNil(req.FirebaseUID),
			Email:       u.TrimOrNil(req.Email),
			DisplayName: u.TrimOrNil(req.DisplayName),
			Role:        u.TrimOrNil(req.Role),
			IsActive:    req.IsActive,
		})
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "create_user_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
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
