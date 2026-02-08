package customersv1

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	customersvc "github.com/zigzagalex/luigi/api/internal/customers"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

// Customers v1 now only exposes admin/shop CRUD under /customers.
// The "current user profile" endpoints (/me/customer) are implemented in authv1,
// because authv1 already owns the session middleware + context user.
func RegisterRoutes(r chi.Router, q db.Querier) {
	svc := customersvc.NewService(q)

	r.Route("/customers", func(r chi.Router) {
		r.Get("/", listHandler(svc))                  // GET /customers?limit=&offset=&shop_id=
		r.Post("/", createHandler(svc))               // POST /customers
		r.Put("/{customerID}", updateHandler(svc))    // PUT /customers/{customerID}
		r.Delete("/{customerID}", deleteHandler(svc)) // DELETE /customers/{customerID}
	})
}

func listHandler(svc *customersvc.Service) http.HandlerFunc {
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

		items, err := svc.List(r.Context(), customersvc.ListInput{
			ShopID: shopIDPtr,
			Limit:  int32(limit),
			Offset: int32(offset),
		})
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "list_customers_failed", err.Error())
			return
		}
		if items == nil {
			items = []db.ListCustomersRow{}
		}
		httpx.JSON(w, http.StatusOK, items)
	}
}

type createReq struct {
	ShopID int64 `json:"shop_id"`

	UserID *int64 `json:"user_id,omitempty"`

	Email     *string `json:"email"`
	Phone     *string `json:"phone"`
	FirstName *string `json:"first_name"`
	LastName  *string `json:"last_name"`

	Address1   *string `json:"address1"`
	Address2   *string `json:"address2"`
	PostalCode *string `json:"postal_code"`
	City       *string `json:"city"`
	Country    *string `json:"country"`

	Notes    *string `json:"notes"`
	IsActive *bool   `json:"is_active"`
}

func createHandler(svc *customersvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}
		if req.ShopID <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "shop_id_required", nil)
			return
		}

		item, err := svc.Create(r.Context(), customersvc.CreateInput{
			ShopID: req.ShopID,
			UserID: req.UserID,

			Email:     u.TrimOrNil(req.Email),
			Phone:     u.TrimOrNil(req.Phone),
			FirstName: u.TrimOrNil(req.FirstName),
			LastName:  u.TrimOrNil(req.LastName),

			Address1:   u.TrimOrNil(req.Address1),
			Address2:   u.TrimOrNil(req.Address2),
			PostalCode: u.TrimOrNil(req.PostalCode),
			City:       u.TrimOrNil(req.City),
			Country:    u.TrimOrNil(req.Country),

			Notes:    u.TrimOrNil(req.Notes),
			IsActive: req.IsActive,
		})
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "create_customer_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}

type updateReq struct {
	Email     *string `json:"email"`
	Phone     *string `json:"phone"`
	FirstName *string `json:"first_name"`
	LastName  *string `json:"last_name"`

	Address1   *string `json:"address1"`
	Address2   *string `json:"address2"`
	PostalCode *string `json:"postal_code"`
	City       *string `json:"city"`
	Country    *string `json:"country"`

	Notes    *string `json:"notes"`
	IsActive *bool   `json:"is_active"`
}

func updateHandler(svc *customersvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(chi.URLParam(r, "customerID"), 10, 64)
		if err != nil || id <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_id", nil)
			return
		}

		var req updateReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}

		item, err := svc.Update(r.Context(), customersvc.UpdateInput{
			ID:        id,
			Email:     u.TrimOrNil(req.Email),
			Phone:     u.TrimOrNil(req.Phone),
			FirstName: u.TrimOrNil(req.FirstName),
			LastName:  u.TrimOrNil(req.LastName),

			Address1:   u.TrimOrNil(req.Address1),
			Address2:   u.TrimOrNil(req.Address2),
			PostalCode: u.TrimOrNil(req.PostalCode),
			City:       u.TrimOrNil(req.City),
			Country:    u.TrimOrNil(req.Country),

			Notes:    u.TrimOrNil(req.Notes),
			IsActive: req.IsActive,
		})
		if err != nil {
			if err == customersvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "customer_not_found", nil)
				return
			}
			log.Printf("update_customer_failed id=%d: %v", id, err)
			httpx.Fail(w, http.StatusInternalServerError, "update_customer_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}

func deleteHandler(svc *customersvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(chi.URLParam(r, "customerID"), 10, 64)
		if err != nil || id <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_id", nil)
			return
		}

		item, err := svc.Delete(r.Context(), id)
		if err != nil {
			if err == customersvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "customer_not_found", nil)
				return
			}
			log.Printf("delete_customer_failed id=%d: %v", id, err)
			httpx.Fail(w, http.StatusInternalServerError, "delete_customer_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}
