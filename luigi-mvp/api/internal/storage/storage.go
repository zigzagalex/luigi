package storage

import (
	"context"
	"io"
)

type Client interface {
	Upload(ctx context.Context, key string, r io.Reader, contentType string) error
	Delete(ctx context.Context, key string) error
}

var (
	_ Client = (*S3Client)(nil)
	_ Client = (*NoopClient)(nil)
)

// NoopClient discards bytes. Tests use it so they do not touch object storage.
type NoopClient struct{}

func NewNoopClient() *NoopClient {
	return &NoopClient{}
}

func (n *NoopClient) Upload(ctx context.Context, key string, r io.Reader, contentType string) error {
	_, _ = io.Copy(io.Discard, r)
	return nil
}

func (n *NoopClient) Delete(ctx context.Context, key string) error {
	return nil
}
