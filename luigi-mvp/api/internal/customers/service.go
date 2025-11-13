package customers

import (
	"context"
	"database/sql"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

type customerQuerier interface {
	CreateCustomer(ctx context.Context, arg *db.CreateCustomerParams) (db.Customer, error)
	ListCustomers(ctx context.Context, arg *db.ListCustomersParams) ([]db.Customer, error)
	UpdateCustomer(ctx context.Context, arg *db.UpdateCustomerParams) (db.Customer, error)
	DeleteCustomer(ctx context.Context, id int64) (db.Customer, error)
}

type Service struct {
	q customerQuerier
}

func NewService(q db.Querier) *Service { return &Service{q: q} }

var ErrNotFound = sql.ErrNoRows

type ListInput struct {
	ShopID *int64
	Limit  int32
	Offset int32
}

func (s *Service) List(ctx context.Context, in ListInput) ([]db.Customer, error) {
	if in.Limit <= 0 || in.Limit > 200 {
		in.Limit = 50
	}
	if in.Offset < 0 {
		in.Offset = 0
	}
	return s.q.ListCustomers(ctx, &db.ListCustomersParams{
		ShopID:     u.ToNullInt64(in.ShopID),
		PageOffset: in.Offset,
		PageLimit:  in.Limit,
	})
}

type CreateInput struct {
	ShopID    int64
	Email     *string
	Phone     *string
	FirstName *string
	LastName  *string
	Notes     *string
	IsActive  *bool // NULL → default TRUE by DB
}

func (s *Service) Create(ctx context.Context, in CreateInput) (db.Customer, error) {
	return s.q.CreateCustomer(ctx, &db.CreateCustomerParams{
		ShopID:    in.ShopID, // NOT NULL
		Email:     u.ToNullString(in.Email),
		Phone:     u.ToNullString(in.Phone),
		FirstName: u.ToNullString(in.FirstName),
		LastName:  u.ToNullString(in.LastName),
		Notes:     u.ToNullString(in.Notes),
		IsActive:  u.ToNullBool(in.IsActive),
	})
}

type UpdateInput struct {
	ID        int64
	Email     *string
	Phone     *string
	FirstName *string
	LastName  *string
	Notes     *string
	IsActive  *bool
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (db.Customer, error) {
	return s.q.UpdateCustomer(ctx, &db.UpdateCustomerParams{
		Email:     u.ToNullString(in.Email),
		Phone:     u.ToNullString(in.Phone),
		FirstName: u.ToNullString(in.FirstName),
		LastName:  u.ToNullString(in.LastName),
		Notes:     u.ToNullString(in.Notes),
		IsActive:  u.ToNullBool(in.IsActive),
		ID:        in.ID,
	})
}

func (s *Service) Delete(ctx context.Context, id int64) (db.Customer, error) {
	return s.q.DeleteCustomer(ctx, id)
}
