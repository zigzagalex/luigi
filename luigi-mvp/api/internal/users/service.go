package users

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

var ErrNotFound = errors.New("user_not_found")

type userQuerier interface {
	ListUsers(ctx context.Context, arg *db.ListUsersParams) ([]db.ListUsersRow, error)
	ListUsersStaffAdmin(ctx context.Context, arg *db.ListUsersStaffAdminParams) ([]db.ListUsersStaffAdminRow, error)
	CreateUser(ctx context.Context, arg *db.CreateUserParams) (db.CreateUserRow, error)
	UpdateUser(ctx context.Context, arg *db.UpdateUserParams) (db.UpdateUserRow, error)
	DeleteUser(ctx context.Context, id int64) (db.DeleteUserRow, error)
	GetUserByEmail(ctx context.Context, email string) (db.GetUserByEmailRow, error)
	GetUserByID(ctx context.Context, id int64) (db.GetUserByIDRow, error)
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
	rows, err := s.q.ListUsersStaffAdmin(ctx, &db.ListUsersStaffAdminParams{
		ShopID:     shopID,
		PageLimit:  in.Limit,
		PageOffset: in.Offset,
	})
	if err != nil {
		return nil, err
	}
	out := make([]db.User, 0, len(rows))
	for _, row := range rows {
		out = append(out, db.User{
			ID:          row.ID,
			ShopID:      row.ShopID,
			StoreID:     row.StoreID,
			Email:       row.Email,
			Phone:       row.Phone,
			DisplayName: row.DisplayName,
			Role:        row.Role,
			IsActive:    row.IsActive,
			CreatedAt:   row.CreatedAt,
			UpdatedAt:   row.UpdatedAt,
		})
	}
	return out, nil
}

type CreateInput struct {
	ShopID       *int64
	StoreID      *int64
	Email        string
	Phone        *string
	DisplayName  *string
	PasswordHash string
	Role         *string // nil -> default "customer" via SQL COALESCE
	IsActive     *bool   // nil -> default TRUE via SQL COALESCE
}

func (s *Service) Create(ctx context.Context, in CreateInput) (db.User, error) {
	email := strings.TrimSpace(in.Email)
	if email == "" {
		return db.User{}, errors.New("email is required")
	}
	if strings.TrimSpace(in.PasswordHash) == "" {
		return db.User{}, errors.New("password_hash is required")
	}

	isActive := in.IsActive
	if isActive == nil {
		v := true
		isActive = &v
	}

	role := in.Role
	if role == nil || strings.TrimSpace(*role) == "" {
		v := "customer"
		role = &v
	}

	row, err := s.q.CreateUser(ctx, &db.CreateUserParams{
		ShopID:       u.ToNullInt64(in.ShopID),
		StoreID:      u.ToNullInt64(in.StoreID),
		Email:        email,
		Phone:        u.ToNullString(in.Phone),
		DisplayName:  u.ToNullString(in.DisplayName),
		PasswordHash: in.PasswordHash,
		Role:         u.ToNullString(role),
		IsActive:     u.ToNullBool(isActive),
	})
	if err != nil {
		return db.User{}, err
	}
	return userFromCreateRow(row), nil
}

type UpdateInput struct {
	ID          int64
	Email       *string
	Phone       *string
	DisplayName *string
	Role        *string
	IsActive    *bool
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (db.User, error) {
	row, err := s.q.UpdateUser(ctx, &db.UpdateUserParams{
		Email:       u.ToNullString(in.Email),
		Phone:       u.ToNullString(in.Phone),
		DisplayName: u.ToNullString(in.DisplayName),
		Role:        u.ToNullString(in.Role),
		IsActive:    u.ToNullBool(in.IsActive),
		ID:          in.ID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return db.User{}, ErrNotFound
		}
		return db.User{}, err
	}
	return userFromUpdateRow(row), nil
}

func (s *Service) Delete(ctx context.Context, id int64) (db.User, error) {
	row, err := s.q.DeleteUser(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return db.User{}, ErrNotFound
		}
		return db.User{}, err
	}
	return userFromDeleteRow(row), nil
}

func (s *Service) GetByEmail(ctx context.Context, email string) (db.User, error) {
	email = strings.TrimSpace(email)
	if email == "" {
		return db.User{}, ErrNotFound
	}

	row, err := s.q.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return db.User{}, ErrNotFound
		}
		return db.User{}, err
	}

	return db.User{
		ID:           row.ID,
		ShopID:       row.ShopID,
		StoreID:      row.StoreID,
		Email:        row.Email,
		Phone:        row.Phone,
		DisplayName:  row.DisplayName,
		PasswordHash: row.PasswordHash,
		Role:         row.Role,
		IsActive:     row.IsActive,
		CreatedAt:    row.CreatedAt,
		UpdatedAt:    row.UpdatedAt,
	}, nil
}

func (s *Service) GetByID(ctx context.Context, id int64) (db.User, error) {
	row, err := s.q.GetUserByID(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return db.User{}, ErrNotFound
		}
		return db.User{}, err
	}

	return db.User{
		ID:          row.ID,
		ShopID:      row.ShopID,
		StoreID:     row.StoreID,
		Email:       row.Email,
		Phone:       row.Phone,
		DisplayName: row.DisplayName,
		Role:        row.Role,
		IsActive:    row.IsActive,
		CreatedAt:   row.CreatedAt,
		UpdatedAt:   row.UpdatedAt,
	}, nil
}

func userFromCreateRow(row db.CreateUserRow) db.User {
	return db.User{
		ID:          row.ID,
		ShopID:      row.ShopID,
		StoreID:     row.StoreID,
		Email:       row.Email,
		Phone:       row.Phone,
		DisplayName: row.DisplayName,
		Role:        row.Role,
		IsActive:    row.IsActive,
		CreatedAt:   row.CreatedAt,
		UpdatedAt:   row.UpdatedAt,
	}
}

func userFromUpdateRow(row db.UpdateUserRow) db.User {
	return db.User{
		ID:          row.ID,
		ShopID:      row.ShopID,
		StoreID:     row.StoreID,
		Email:       row.Email,
		Phone:       row.Phone,
		DisplayName: row.DisplayName,
		Role:        row.Role,
		IsActive:    row.IsActive,
		CreatedAt:   row.CreatedAt,
		UpdatedAt:   row.UpdatedAt,
	}
}

func userFromDeleteRow(row db.DeleteUserRow) db.User {
	return db.User{
		ID:          row.ID,
		ShopID:      row.ShopID,
		StoreID:     row.StoreID,
		Email:       row.Email,
		Phone:       row.Phone,
		DisplayName: row.DisplayName,
		Role:        row.Role,
		IsActive:    row.IsActive,
		CreatedAt:   row.CreatedAt,
		UpdatedAt:   row.UpdatedAt,
	}
}
