package main

import (
	"bytes"
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/zigzagalex/luigi/api/internal/storage"
)

func main() {
	dir := flag.String("dir", "", "directory of catalog files, usually web-shop/public/media")
	flag.Parse()
	if strings.TrimSpace(*dir) == "" {
		log.Fatal("-dir is required")
	}

	root, err := filepath.Abs(*dir)
	if err != nil {
		log.Fatal(err)
	}

	client, err := storage.NewS3Client(storage.S3Options{
		Endpoint:  env("S3_SEED_ENDPOINT", "http://127.0.0.1:8333"),
		Bucket:    env("S3_BUCKET", "luigi"),
		AccessKey: env("S3_ACCESS_KEY", "luigi"),
		SecretKey: env("S3_SECRET_KEY", "luigi-dev-secret"),
		Region:    env("S3_REGION", "us-east-1"),
	})
	if err != nil {
		log.Fatal(err)
	}

	var uploaded int
	err = filepath.WalkDir(root, func(path string, d os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() {
			if d.Name() == "placeholders" {
				return filepath.SkipDir
			}
			return nil
		}
		if strings.HasPrefix(d.Name(), ".") {
			return nil
		}

		rel, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		key := "media/" + filepath.ToSlash(rel)

		f, err := os.Open(path)
		if err != nil {
			return err
		}
		defer f.Close()

		if err := client.Upload(context.Background(), key, f, contentType(path)); err != nil {
			return fmt.Errorf("upload %s: %w", key, err)
		}
		fmt.Printf("uploaded %s\n", key)
		uploaded++
		return nil
	})
	if err != nil {
		log.Fatal(err)
	}
	if uploaded == 0 {
		log.Fatalf("no files uploaded from %s", root)
	}
	fmt.Printf("uploaded %d objects\n", uploaded)
}

func contentType(path string) string {
	f, err := os.Open(path)
	if err != nil {
		return "application/octet-stream"
	}
	defer f.Close()

	buf := make([]byte, 32)
	n, _ := f.Read(buf)
	buf = buf[:n]

	switch {
	case bytes.HasPrefix(buf, []byte{0xff, 0xd8, 0xff}):
		return "image/jpeg"
	case bytes.HasPrefix(buf, []byte{0x89, 'P', 'N', 'G'}):
		return "image/png"
	case len(buf) >= 12 && bytes.Equal(buf[:4], []byte("RIFF")) && bytes.Equal(buf[8:12], []byte("WEBP")):
		return "image/webp"
	case len(buf) >= 12 && bytes.Equal(buf[4:8], []byte("ftyp")) && bytes.Contains(buf[8:], []byte("avif")):
		return "image/avif"
	default:
		return "application/octet-stream"
	}
}

func env(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return def
}
