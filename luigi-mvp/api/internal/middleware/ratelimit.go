package middleware

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/zigzagalex/luigi/api/internal/httpx"
)

type visitor struct {
	times []time.Time
}

// RateLimit allows at most limit requests per IP within window.
func RateLimit(limit int, window time.Duration) func(http.Handler) http.Handler {
	var mu sync.Mutex
	visitors := map[string]*visitor{}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := clientIP(r)
			now := time.Now()
			cutoff := now.Add(-window)

			mu.Lock()
			v := visitors[ip]
			if v == nil {
				v = &visitor{}
				visitors[ip] = v
			}
			kept := v.times[:0]
			for _, t := range v.times {
				if t.After(cutoff) {
					kept = append(kept, t)
				}
			}
			v.times = kept
			if len(v.times) >= limit {
				mu.Unlock()
				httpx.Fail(w, http.StatusTooManyRequests, "rate_limited", nil)
				return
			}
			v.times = append(v.times, now)
			mu.Unlock()

			next.ServeHTTP(w, r)
		})
	}
}

func clientIP(r *http.Request) string {
	host := remoteHost(r)
	// Caddy overwrites these headers, and it is the only peer on the Docker network.
	// A public client can set them too, so they are ignored unless the socket peer is private.
	if isTrustedProxy(host) {
		if xff := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); xff != "" {
			parts := strings.Split(xff, ",")
			if ip := strings.TrimSpace(parts[len(parts)-1]); ip != "" {
				return ip
			}
		}
		if xri := strings.TrimSpace(r.Header.Get("X-Real-IP")); xri != "" {
			return xri
		}
	}
	if host != "" {
		return host
	}
	return "unknown"
}

func remoteHost(r *http.Request) string {
	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil && host != "" {
		return host
	}
	return strings.TrimSpace(r.RemoteAddr)
}

func isTrustedProxy(host string) bool {
	ip := net.ParseIP(host)
	if ip == nil {
		return false
	}
	return ip.IsPrivate() || ip.IsLoopback()
}
