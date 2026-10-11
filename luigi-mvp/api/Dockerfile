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

# Default target. Production Compose runs goose and seedadmin from this image
# so the VPS does not need a checkout of the SQL. Dev Compose still uses the
# migrate and seed targets above, with migrations mounted for fast edits.
FROM busybox:1.36.1-glibc AS busybox

FROM gcr.io/distroless/base-debian12 AS api
ENV PORT=8080
EXPOSE 8080
COPY --from=busybox /bin/busybox /busybox
COPY --from=goose-build /go/bin/goose /goose
COPY --from=build /bin/seedadmin /seedadmin
COPY --from=build /src/migrations /migrations
COPY --from=build /bin/api /api
USER nonroot:nonroot
ENTRYPOINT ["/api"]
