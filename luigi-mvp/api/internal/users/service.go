package users

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

type userQuerier interface {
	ListUsers(ctx context.Context, arg *db.ListUsersParams) ([]db.User, error)
	CreateUser(ctx context.Context, arg *db.CreateUserParams) (db.User, error)
	UpdateUser(ctx context.Context, arg *db.UpdateUserParams) (db.User, error)
	DeleteUser(ctx context.Context, id int64) (db.User, error)
	GetUserByFirebaseUID(ctx context.Context, firebaseUid string) (db.User, error)
}

type Service struct {
	q userQuerier
}

func NewService(q db.Querier) *Service {
	return &Service{q: q}
}

type ListInput struct {
	ShopID *int64
	Limit  int32
	Offset int32
}

func (s *Service) List(ctx context.Context, in ListInput) ([]db.User, error) {
	if in.Limit <= 0 || in.Limit > 200 {
		in.Limit = 50
	}
	if in.Offset < 0 {
		in.Offset = 0
	}
	var shopID sql.NullInt64
	if in.ShopID != nil {
		shopID = sql.NullInt64{Int64: *in.ShopID, Valid: true}
	}
	return s.q.ListUsers(ctx, &db.ListUsersParams{
		ShopID:     shopID,
		PageLimit:  in.Limit,
		PageOffset: in.Offset,
	})
}

type CreateInput struct {
	ShopID      *int64
	StoreID     *int64
	FirebaseUID *string
	Email       *string
	DisplayName *string
	Role        *string // nil -> default "customer" via SQL COALESCE
	IsActive    *bool   // nil -> default TRUE via SQL COALESCE
}

func (s *Service) Create(ctx context.Context, in CreateInput) (db.User, error) {
	// Default is_active
	isActive := in.IsActive
	if isActive == nil {
		v := true
		isActive = &v
	}

	// Default role
	role := in.Role
	if role == nil || strings.TrimSpace(*role) == "" {
		v := "customer"
		role = &v
	}

	return s.q.CreateUser(ctx, &db.CreateUserParams{
		ShopID:      u.ToNullInt64(in.ShopID),
		StoreID:     u.ToNullInt64(in.StoreID),
		FirebaseUid: u.ToNullString(in.FirebaseUID),
		Email:       u.ToNullString(in.Email),
		DisplayName: u.ToNullString(in.DisplayName),
		Role:        u.ToNullString(role),
		IsActive:    u.ToNullBool(isActive),
	})
}

type UpdateInput struct {
	ID          int64
	Email       *string
	DisplayName *string
	Role        *string
	IsActive    *bool
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (db.User, error) {
	return s.q.UpdateUser(ctx, &db.UpdateUserParams{
		Email:       u.ToNullString(in.Email),
		DisplayName: u.ToNullString(in.DisplayName),
		Role:        u.ToNullString(in.Role),
		IsActive:    u.ToNullBool(in.IsActive),
		ID:          in.ID,
	})
}

func (s *Service) Delete(ctx context.Context, id int64) (db.User, error) {
	return s.q.DeleteUser(ctx, id)
}

func (s *Service) GetUserByFirebaseUID(ctx context.Context, firebaseUid string) (db.User, error) {
	uid := strings.TrimSpace(firebaseUid)
	if uid == "" {
		return db.User{}, ErrNotFound
	}

	user, err := s.q.GetUserByFirebaseUID(ctx, uid)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return db.User{}, ErrNotFound
		}
		return db.User{}, err
	}

	return user, nil
}

var ErrNotFound = errors.New("user_not_found")
