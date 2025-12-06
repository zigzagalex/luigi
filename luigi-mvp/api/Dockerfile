ARG GO_VERSION=1.25.5
FROM golang:${GO_VERSION} AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /bin/api ./cmd/api

FROM gcr.io/distroless/base-debian12
ENV PORT=8080
EXPOSE 8080
USER nonroot:nonroot
COPY --from=build /bin/api /api
ENTRYPOINT ["/api"]
