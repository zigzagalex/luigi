package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"unicode"

	"golang.org/x/crypto/argon2"
)

const (
	argon2Time    uint32 = 3
	argon2Memory  uint32 = 64 * 1024
	argon2Threads uint8  = 1
	argon2KeyLen  uint32 = 32
	argon2SaltLen        = 16

	minPasswordLen = 8
)

// ErrWeakPassword is returned when a password fails the creation policy.
var ErrWeakPassword = errors.New("password must be at least 8 characters and include a letter, a number, and a symbol")

func ValidatePassword(password string) error {
	if len([]rune(password)) < minPasswordLen {
		return ErrWeakPassword
	}

	var hasLetter, hasNumber, hasSymbol bool
	for _, r := range password {
		switch {
		case unicode.IsLetter(r):
			hasLetter = true
		case unicode.IsNumber(r):
			hasNumber = true
		case unicode.IsSpace(r):
			// spaces do not count as the required symbol
		case unicode.IsSymbol(r) || unicode.IsPunct(r):
			hasSymbol = true
		}
	}
	if !hasLetter || !hasNumber || !hasSymbol {
		return ErrWeakPassword
	}
	return nil
}

// HashPassword returns a PHC-encoded argon2id hash suitable for users.password_hash.
func HashPassword(password string) (string, error) {
	if err := ValidatePassword(password); err != nil {
		return "", err
	}

	salt := make([]byte, argon2SaltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("generate salt: %w", err)
	}

	hash := argon2.IDKey([]byte(password), salt, argon2Time, argon2Memory, argon2Threads, argon2KeyLen)

	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)

	return fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, argon2Memory, argon2Time, argon2Threads, b64Salt, b64Hash,
	), nil
}

// CheckPassword reports whether password matches a PHC-encoded argon2id hash.
func CheckPassword(encoded, password string) (bool, error) {
	parts := strings.Split(encoded, "$")
	// "", "argon2id", "v=19", "m=...,t=...,p=...", salt, hash
	if len(parts) != 6 {
		return false, errors.New("invalid password hash")
	}
	if parts[1] != "argon2id" {
		return false, errors.New("unsupported hash algorithm")
	}

	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil {
		return false, errors.New("invalid hash version")
	}

	var memory, time uint32
	var threads uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &time, &threads); err != nil {
		return false, errors.New("invalid hash parameters")
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false, errors.New("invalid hash salt")
	}
	decodedHash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false, errors.New("invalid hash value")
	}
	if len(decodedHash) == 0 {
		return false, errors.New("invalid hash value")
	}

	comparison := argon2.IDKey([]byte(password), salt, time, memory, threads, uint32(len(decodedHash)))
	if subtle.ConstantTimeCompare(decodedHash, comparison) == 1 {
		return true, nil
	}
	return false, nil
}
