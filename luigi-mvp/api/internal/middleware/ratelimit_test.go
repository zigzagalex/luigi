package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRateLimit(t *testing.T) {
	h := RateLimit(2, time.Minute)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/v1/auth/login", nil)
	req.RemoteAddr = "203.0.113.10:12345"

	for i := 0; i < 2; i++ {
		rr := httptest.NewRecorder()
		h.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("request %d: got %d", i+1, rr.Code)
		}
	}

	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", rr.Code)
	}
}

func TestRateLimitIgnoresSpoofedForwardedForFromPublicPeer(t *testing.T) {
	h := RateLimit(1, time.Minute)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	first := httptest.NewRequest(http.MethodPost, "/v1/auth/login", nil)
	first.RemoteAddr = "203.0.113.10:1"
	first.Header.Set("X-Forwarded-For", "198.51.100.1")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, first)
	if rr.Code != http.StatusOK {
		t.Fatalf("first request: got %d", rr.Code)
	}

	second := httptest.NewRequest(http.MethodPost, "/v1/auth/login", nil)
	second.RemoteAddr = "203.0.113.10:2"
	second.Header.Set("X-Forwarded-For", "198.51.100.2")
	rr = httptest.NewRecorder()
	h.ServeHTTP(rr, second)
	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("spoofed X-Forwarded-For was trusted, got %d", rr.Code)
	}
}

func TestRateLimitUsesRightmostForwardedForFromPrivatePeer(t *testing.T) {
	h := RateLimit(1, time.Minute)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	for _, client := range []string{"198.51.100.20", "198.51.100.21"} {
		req := httptest.NewRequest(http.MethodPost, "/v1/auth/login", nil)
		req.RemoteAddr = "172.18.0.5:1234"
		req.Header.Set("X-Forwarded-For", "203.0.113.9, "+client)
		rr := httptest.NewRecorder()
		h.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("client %s: got %d", client, rr.Code)
		}
	}
}
