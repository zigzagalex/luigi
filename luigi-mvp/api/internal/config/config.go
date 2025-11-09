package config

import (
	"fmt"
	"log"
	"os"
	"time"
)

type Config struct {
	Env            string
	Port           string
	DatabaseURL    string 
	MaxOpenConns   int
	MaxIdleConns   int
	ConnMaxIdle    time.Duration
	ConnMaxLifetime time.Duration
}

func env(k string) string {
	v := os.Getenv(k)
	if v == "" {
		log.Fatalf("missing env %s", k)
	}
	return v
}


func Load() Config {
	return Config{
		Env:            env("ENV"),
		Port:           env("PORT"),
		DatabaseURL:    fmt.Sprintf("host=/cloudsql/%s user=%s password=%s dbname=%s sslmode=disable",
							env("DB_INSTANCE"), env("DB_USER"), env("DB_PASSWORD"), env("DB_NAME"),
						),
		MaxOpenConns:   10,
		MaxIdleConns:   5,
		ConnMaxIdle:    5 * time.Minute,
		ConnMaxLifetime: 30 * time.Minute,
	}
}