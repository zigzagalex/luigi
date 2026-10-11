package storage

import (
	"bytes"
	"context"
	"errors"
	"io"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3Options points the client at any S3-compatible endpoint. SeaweedFS ignores Region.
type S3Options struct {
	Endpoint  string
	Bucket    string
	AccessKey string
	SecretKey string
	Region    string
}

// S3Client stores objects with path-style URLs: {endpoint}/{bucket}/{key}.
type S3Client struct {
	bucket string
	api    *s3.Client
}

func NewS3Client(opts S3Options) (*S3Client, error) {
	opts.Endpoint = strings.TrimRight(strings.TrimSpace(opts.Endpoint), "/")
	opts.Bucket = strings.TrimSpace(opts.Bucket)
	opts.AccessKey = strings.TrimSpace(opts.AccessKey)
	opts.SecretKey = strings.TrimSpace(opts.SecretKey)
	opts.Region = strings.TrimSpace(opts.Region)
	if opts.Endpoint == "" || opts.Bucket == "" || opts.AccessKey == "" || opts.SecretKey == "" || opts.Region == "" {
		return nil, errors.New("s3 endpoint, bucket, access key, secret key, and region are required")
	}

	api := s3.New(s3.Options{
		Region:       opts.Region,
		BaseEndpoint: aws.String(opts.Endpoint),
		Credentials:  credentials.NewStaticCredentialsProvider(opts.AccessKey, opts.SecretKey, ""),
		UsePathStyle: true,
	})
	return &S3Client{bucket: opts.Bucket, api: api}, nil
}

func (c *S3Client) Upload(ctx context.Context, key string, r io.Reader, contentType string) error {
	body, err := io.ReadAll(r)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	in := &s3.PutObjectInput{
		Bucket:        aws.String(c.bucket),
		Key:           aws.String(key),
		Body:          bytes.NewReader(body),
		ContentLength: aws.Int64(int64(len(body))),
	}
	if contentType != "" {
		in.ContentType = aws.String(contentType)
	}
	_, err = c.api.PutObject(ctx, in)
	return err
}

func (c *S3Client) Delete(ctx context.Context, key string) error {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	_, err := c.api.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	return err
}
