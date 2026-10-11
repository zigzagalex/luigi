ARG GO_VERSION=1.25.5

# One-shot goose binary. Migrations are mounted at runtime so SQL edits
# do not require rebuilding this stage.
FROM golang:${GO_VERSION} AS goose-build
RUN CGO_ENABLED=0 go install github.com/pressly/goose/v3/cmd/goose@v3.24.3

FROM gcr.io/distroless/base-debian12 AS migrate
COPY --from=goose-build /go/bin/goose /goose
USER nonroot:nonroot
ENTRYPOINT ["/goose"]

FROM golang:${GO_VERSION} AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /bin/api ./cmd/api \
 && CGO_ENABLED=0 go build -o /bin/seedadmin ./cmd/seedadmin

FROM gcr.io/distroless/base-debian12 AS seed
USER nonroot:nonroot
COPY --from=build /bin/seedadmin /seedadmin
ENTRYPOINT ["/seedadmin"]

# Default target. Cloud Run and `docker build` without --target keep producing the API.
FROM gcr.io/distroless/base-debian12 AS api
ENV PORT=8080
EXPOSE 8080
USER nonroot:nonroot
COPY --from=build /bin/api /api
ENTRYPOINT ["/api"]
