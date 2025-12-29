package auth

import (
	"context"

	firebase "firebase.google.com/go/v4"
	fbauth "firebase.google.com/go/v4/auth"
)

func NewFirebaseAuthClient(ctx context.Context) (*fbauth.Client, error) {
	app, err := firebase.NewApp(ctx, nil) // uses ADC / GOOGLE_APPLICATION_CREDENTIALS
	if err != nil {
		return nil, err
	}
	return app.Auth(ctx)
}
