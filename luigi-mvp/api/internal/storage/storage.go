package storage

import (
    "context"
    "io"
    "time"

    "cloud.google.com/go/storage"
    "google.golang.org/api/option"
)

type Client interface {
    Upload(ctx context.Context, key string, r io.Reader, contentType string) error
    Delete(ctx context.Context, key string) error
}

type GCSClient struct {
    bucket       *storage.BucketHandle
}

func NewGCSClient(ctx context.Context, bucketName string, opts ...option.ClientOption) (*GCSClient, error) {
    c, err := storage.NewClient(ctx, opts...)
    if err != nil {
        return nil, err
    }
    return &GCSClient{
        bucket: c.Bucket(bucketName),
    }, nil
}

func (g *GCSClient) Upload(ctx context.Context, key string, r io.Reader, contentType string) error {
    obj := g.bucket.Object(key)

    // optional: set timeouts via context
    ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
    defer cancel()

    w := obj.NewWriter(ctx)
    if contentType != "" {
        w.ContentType = contentType
    }

    if _, err := io.Copy(w, r); err != nil {
        _ = w.Close()
        return err
    }

    return w.Close()
}

func (g *GCSClient) Delete(ctx context.Context, key string) error {
    obj := g.bucket.Object(key)
    ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
    defer cancel()

    return obj.Delete(ctx)
}
