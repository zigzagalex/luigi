package storage

import (
	"context"
	"io"
	"net/http"
	"os"
	"strings"
	"testing"
)

func TestLiveAnonymousRead(t *testing.T) {
	endpoint := os.Getenv("S3_LIVE_ENDPOINT")
	if endpoint == "" {
		t.Skip("set S3_LIVE_ENDPOINT to run against SeaweedFS")
	}

	client, err := NewS3Client(S3Options{
		Endpoint:  endpoint,
		Bucket:    "luigi",
		AccessKey: "luigi",
		SecretKey: "luigi-dev-secret",
		Region:    "us-east-1",
	})
	if err != nil {
		t.Fatal(err)
	}

	key := "product-variants/1/step4_orig.txt"
	if err := client.Upload(context.Background(), key, strings.NewReader("hello-public"), "text/plain"); err != nil {
		t.Fatalf("authenticated upload: %v", err)
	}
	t.Cleanup(func() {
		_ = client.Delete(context.Background(), key)
	})

	publicURL := strings.TrimRight(endpoint, "/") + "/luigi/" + key
	res, err := http.Get(publicURL)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusOK || string(body) != "hello-public" {
		t.Fatalf("anonymous GET %s status %d body %q", publicURL, res.StatusCode, body)
	}

	put, err := http.NewRequest(http.MethodPut, publicURL, strings.NewReader("nope"))
	if err != nil {
		t.Fatal(err)
	}
	putRes, err := http.DefaultClient.Do(put)
	if err != nil {
		t.Fatal(err)
	}
	defer putRes.Body.Close()
	if putRes.StatusCode < 400 {
		t.Fatalf("anonymous PUT status %d, want denial", putRes.StatusCode)
	}
}
