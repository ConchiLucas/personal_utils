package main

import (
	"fmt"
	"log"

	"personal_utils/server/internal/api"
	"personal_utils/server/internal/config"
	"personal_utils/server/internal/db"
	"personal_utils/server/internal/docker"
	"personal_utils/server/internal/service"
)

func main() {
	cfg := config.Load()
	log.Printf("[Server] Starting Personal Utils backend on port %s", cfg.Port)

	// Initialize Database (PostgreSQL / SQLite fallback)
	_, err := db.Init(cfg.DatabaseDSN)
	if err != nil {
		log.Fatalf("[DB] Fatal error initializing database: %v", err)
	}

	// Initialize MinIO Service
	if _, err := service.InitMinio(); err != nil {
		log.Printf("[MinIO] Warning: Failed to connect to MinIO (%v)", err)
	}

	// Initialize Docker Service
	dockerSvc := docker.NewService(cfg.DockerHost)

	// Initialize Handler & Router
	handler := api.NewHandler(dockerSvc)
	router := api.SetupRouter(handler, cfg.AllowOrigins)

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("[Server] Listening on http://0.0.0.0:%s", cfg.Port)
	if err := router.Run(addr); err != nil {
		log.Fatalf("[Server] Failed to run server: %v", err)
	}
}
