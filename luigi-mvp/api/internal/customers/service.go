package customers

import (
	"context"
	"database/sql"
	"errors"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

type customerQuerier interface {
	CreateCustomer(ctx context.Context, arg *db.CreateCustomerParams) (db.Customer, error)
	ListCustomers(ctx context.Context, arg *db.ListCustomersParams) ([]db.ListCustomersRow, error)
	UpdateCustomer(ctx context.Context, arg *db.UpdateCustomerParams) (db.Customer, error)
	DeleteCustomer(ctx context.Context, id int64) (db.Customer, error)
	GetCustomerByUserID(ctx context.Context, userID sql.NullInt64) (db.Customer, error)
}

type Service struct {
	q customerQuerier
}

func NewService(q customerQuerier) *Service { return &Service{q: q} }

var ErrNotFound = sql.ErrNoRows

type ListInput struct {
	ShopID *int64
	Limit  int32
	Offset int32
}

func (s *Service) List(ctx context.Context, in ListInput) ([]db.ListCustomersRow, error) { // ✅ change
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
	ShopID int64
	UserID *int64

	Email     *string
	Phone     *string
	FirstName *string
	LastName  *string

	Address1   *string
	Address2   *string
	PostalCode *string
	City       *string
	Country    *string

	Notes    *string
	IsActive *bool // NULL → default TRUE by DB
}

func (s *Service) Create(ctx context.Context, in CreateInput) (db.Customer, error) {
	country := u.TrimOrNil(in.Country)
	if country == nil {
		v := "CH"
		country = &v
	}

	return s.q.CreateCustomer(ctx, &db.CreateCustomerParams{
		ShopID: in.ShopID,

		UserID:     u.ToNullInt64(in.UserID),
		Email:      u.ToNullString(in.Email),
		Phone:      u.ToNullString(in.Phone),
		FirstName:  u.ToNullString(in.FirstName),
		LastName:   u.ToNullString(in.LastName),
		Address1:   u.ToNullString(in.Address1),
		Address2:   u.ToNullString(in.Address2),
		PostalCode: u.ToNullString(in.PostalCode),
		City:       u.ToNullString(in.City),
		Country:    u.ToNullString(country),

		Notes:    u.ToNullString(in.Notes),
		IsActive: u.ToNullBool(in.IsActive),
	})
}

type UpdateInput struct {
	ID        int64
	Email     *string
	Phone     *string
	FirstName *string
	LastName  *string

	Address1   *string
	Address2   *string
	PostalCode *string
	City       *string
	Country    *string

	Notes    *string
	IsActive *bool
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (db.Customer, error) {
	// Optional: normalize default country if explicitly provided empty
	country := u.TrimOrNil(in.Country)

	return s.q.UpdateCustomer(ctx, &db.UpdateCustomerParams{
		Email:     u.ToNullString(in.Email),
		Phone:     u.ToNullString(in.Phone),
		FirstName: u.ToNullString(in.FirstName),
		LastName:  u.ToNullString(in.LastName),

		Address1:   u.ToNullString(in.Address1),
		Address2:   u.ToNullString(in.Address2),
		PostalCode: u.ToNullString(in.PostalCode),
		City:       u.ToNullString(in.City),
		Country:    u.ToNullString(country),

		Notes:    u.ToNullString(in.Notes),
		IsActive: u.ToNullBool(in.IsActive),

		ID: in.ID,
	})
}

func (s *Service) Delete(ctx context.Context, id int64) (db.Customer, error) {
	return s.q.DeleteCustomer(ctx, id)
}

func (s *Service) GetCustomerByUserID(ctx context.Context, userID int64) (db.Customer, error) {
	if userID <= 0 {
		return db.Customer{}, ErrNotFound
	}
	c, err := s.q.GetCustomerByUserID(ctx, sql.NullInt64{Int64: userID, Valid: true})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return db.Customer{}, ErrNotFound
		}
		return db.Customer{}, err
	}
	return c, nil
}
