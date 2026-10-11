package storage

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestNewS3ClientRejectsMissingSettings(t *testing.T) {
	_, err := NewS3Client(S3Options{Endpoint: "http://seaweedfs:8333", Bucket: "luigi"})
	if err == nil {
		t.Fatal("expected error for missing credentials and region")
	}
}

func TestS3ClientUploadAndDeleteUsePathStyle(t *testing.T) {
	var uploadedPath, uploadedType, uploadedBody string
	var deletedPath string

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPut:
			uploadedPath = r.URL.Path
			uploadedType = r.Header.Get("Content-Type")
			b, _ := io.ReadAll(r.Body)
			uploadedBody = string(b)
			w.WriteHeader(http.StatusOK)
		case http.MethodDelete:
			deletedPath = r.URL.Path
			w.WriteHeader(http.StatusNoContent)
		default:
			http.Error(w, "unexpected", http.StatusMethodNotAllowed)
		}
	}))
	defer srv.Close()

	client, err := NewS3Client(S3Options{
		Endpoint:  srv.URL,
		Bucket:    "luigi",
		AccessKey: "luigi",
		SecretKey: "luigi-dev-secret",
		Region:    "us-east-1",
	})
	if err != nil {
		t.Fatalf("NewS3Client: %v", err)
	}

	key := "product-variants/12/abc_orig.jpg"
	if err := client.Upload(context.Background(), key, strings.NewReader("hello"), "image/jpeg"); err != nil {
		t.Fatalf("Upload: %v", err)
	}
	if uploadedPath != "/luigi/"+key {
		t.Fatalf("upload path = %q", uploadedPath)
	}
	if uploadedType != "image/jpeg" || uploadedBody != "hello" {
		t.Fatalf("upload type %q body %q", uploadedType, uploadedBody)
	}

	if err := client.Delete(context.Background(), key); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if deletedPath != "/luigi/"+key {
		t.Fatalf("delete path = %q", deletedPath)
	}
}
