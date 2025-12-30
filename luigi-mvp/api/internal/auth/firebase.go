package auth

import (
	"context"
	"errors"
	"strings"

	firebase "firebase.google.com/go/v4"
	fbauth "firebase.google.com/go/v4/auth"
)

func NewFirebaseAuthClient(ctx context.Context, projectID string) (*fbauth.Client, error) {
	pid := strings.TrimSpace(projectID)
	if pid == "" {
		return nil, errors.New("firebase project id is required")
	}

	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: pid})
	if err != nil {
		return nil, err
	}
	return app.Auth(ctx)
}
