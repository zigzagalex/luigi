package auth

import "testing"

func TestHashTokenStableAndDistinct(t *testing.T) {
	const secret = "test-session-secret"

	a := HashToken(secret, "token-a")
	b := HashToken(secret, "token-a")
	c := HashToken(secret, "token-b")

	if a != b {
		t.Fatalf("expected stable hash, got %q vs %q", a, b)
	}
	if a == c {
		t.Fatal("expected different tokens to hash differently")
	}
	if len(a) != 64 {
		t.Fatalf("expected sha256 hex length 64, got %d", len(a))
	}
}

func TestNewSessionToken(t *testing.T) {
	tok, err := NewSessionToken()
	if err != nil {
		t.Fatalf("NewSessionToken: %v", err)
	}
	if tok == "" {
		t.Fatal("expected non-empty token")
	}
	other, err := NewSessionToken()
	if err != nil {
		t.Fatalf("NewSessionToken: %v", err)
	}
	if tok == other {
		t.Fatal("expected unique tokens")
	}
}
