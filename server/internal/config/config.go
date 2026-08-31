package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port         string
	DatabaseDSN  string
	DockerHost   string
	AllowOrigins []string
}

func Load() *Config {
	port := getEnv("PORT", "39888")
	dbDSN := getDatabaseDSN()
	dockerHost := getEnv("DOCKER_HOST", "")

	return &Config{
		Port:         port,
		DatabaseDSN:  dbDSN,
		DockerHost:   dockerHost,
		AllowOrigins: []string{"http://localhost:39889", "http://127.0.0.1:39889", "http://localhost:5173", "http://127.0.0.1:5173", "*"},
	}
}

func getDatabaseDSN() string {
	if dsn := os.Getenv("DATABASE_URL"); dsn != "" {
		return dsn
	}
	if dsn := os.Getenv("APP_DSN"); dsn != "" {
		return dsn
	}

	host := getEnv("APP_DB_HOST", "127.0.0.1")
	port := getEnv("APP_DB_PORT", "5432")
	user := getEnv("APP_DB_USER", "conchi")
	pass := getEnv("APP_DB_PASSWORD", "conchi123456")
	name := getEnv("APP_DB_NAME", "personal_utils")
	cfg := getEnv("APP_DB_CONFIG", "sslmode=disable")

	return fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s %s",
		host, user, pass, name, port, cfg)
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
