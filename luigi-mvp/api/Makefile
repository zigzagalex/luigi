.PHONY: run sqlc test test-unit test-int

run:
	go run ./cmd/api

sqlc:
	sqlc generate

test: test-unit

test-unit:
	go test ./...

# Integration tests behind a build tag
test-int:
	go test -tags=integration ./...
