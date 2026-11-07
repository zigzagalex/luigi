package httpx

import (
	"encoding/json"
	"log"
	"net/http"
)

type APIError struct {
	Error   string `json:"error"`
	Details any    `json:"details,omitempty"`
}

func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v == nil || status == http.StatusNoContent {
		return
	}
	_ = json.NewEncoder(w).Encode(v)
}

func Fail(w http.ResponseWriter, status int, msg string, details any) {
	if status >= http.StatusInternalServerError && details != nil {
		log.Printf("%s: %v", msg, details)
		details = nil
	}
	JSON(w, status, APIError{Error: msg, Details: details})
}

// ServerError logs err and responds with the stable code only.
func ServerError(w http.ResponseWriter, code string, err error) {
	if err != nil {
		log.Printf("%s: %v", code, err)
	}
	Fail(w, http.StatusInternalServerError, code, nil)
}
