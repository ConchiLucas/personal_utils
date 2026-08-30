.PHONY: dev-backend dev-frontend dev build clean

# Run Go backend on :18999
dev-backend:
	cd server && go run ./cmd/server/main.go

# Run React frontend on :5173
dev-frontend:
	cd web && npm run dev

# Run both in background
dev:
	@echo "Starting Go backend on :18999 and Vite frontend on :5173..."
	@(cd server && go run ./cmd/server/main.go) & (cd web && npm run dev)

build-web:
	cd web && npm run build

build-server:
	cd server && go build -o ../bin/server ./cmd/server/main.go

build: build-web build-server
	@echo "Build complete! Output in bin/server and web/dist"
