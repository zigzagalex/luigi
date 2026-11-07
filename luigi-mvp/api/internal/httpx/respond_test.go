package httpx

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestServerErrorHidesCause(t *testing.T) {
	rec := httptest.NewRecorder()
	ServerError(rec, "checkout_failed", errString("pq: password authentication failed for user \"luigi\""))

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d", rec.Code)
	}
	var body APIError
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Error != "checkout_failed" || body.Details != nil {
		t.Fatalf("body = %#v", body)
	}
	if strings.Contains(rec.Body.String(), "password") || strings.Contains(rec.Body.String(), "pq:") {
		t.Fatalf("response leaked server error: %s", rec.Body.String())
	}
}

func TestFailStripsServerDetails(t *testing.T) {
	rec := httptest.NewRecorder()
	Fail(rec, http.StatusInternalServerError, "list_failed", "relation \"users\" does not exist")

	var body APIError
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Error != "list_failed" || body.Details != nil {
		t.Fatalf("body = %#v", body)
	}
}

type errString string

func (e errString) Error() string { return string(e) }
