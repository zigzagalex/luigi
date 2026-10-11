package auth

import (
	"errors"
	"testing"
)

func TestHashAndCheckPassword(t *testing.T) {
	const password = "Correct1!"

	encoded, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword: %v", err)
	}

	ok, err := CheckPassword(encoded, password)
	if err != nil {
		t.Fatalf("CheckPassword: %v", err)
	}
	if !ok {
		t.Fatal("expected password to match")
	}

	ok, err = CheckPassword(encoded, "Wrong1!")
	if err != nil {
		t.Fatalf("CheckPassword wrong: %v", err)
	}
	if ok {
		t.Fatal("expected wrong password to fail")
	}
}

func TestValidatePassword(t *testing.T) {
	cases := []struct {
		name    string
		password string
		wantErr bool
	}{
		{name: "ok", password: "Correct1!", wantErr: false},
		{name: "too short", password: "Ab1!", wantErr: true},
		{name: "no number", password: "Correct!!", wantErr: true},
		{name: "no letter", password: "12345678!", wantErr: true},
		{name: "no symbol", password: "Correct12", wantErr: true},
		{name: "empty", password: "", wantErr: true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidatePassword(tc.password)
			if tc.wantErr {
				if !errors.Is(err, ErrWeakPassword) {
					t.Fatalf("got %v, want ErrWeakPassword", err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}
