package api

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func SetupRouter(h *Handler, allowOrigins []string) *gin.Engine {
	r := gin.Default()

	// CORS Configuration
	corsConfig := cors.Config{
		AllowOrigins:     allowOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization", "Accept", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	r.Use(cors.New(corsConfig))

	// API Route Group
	api := r.Group("/api")
	{
		api.GET("/health", h.GetHealth)

		// Workspaces
		api.GET("/workspaces", h.GetWorkspaces)
		api.POST("/workspaces", h.CreateWorkspace)
		api.DELETE("/workspaces/:id", h.DeleteWorkspace)

		// Containers
		api.GET("/containers", h.GetContainers)
		api.GET("/containers/:id/logs", h.GetContainerLogs)
		api.POST("/containers/:id/action", h.ContainerAction)

		// Network & Diagnostics
		api.POST("/diagnostics/ping", h.DiagnosticPing)

		// Notes (AI Developer Notes)
		api.GET("/notes", h.GetNotes)
		api.GET("/notes/:id", h.GetNote)
		api.POST("/notes", h.CreateNote)
		api.PUT("/notes/:id", h.UpdateNote)
		api.DELETE("/notes/:id", h.DeleteNote)

		// Agile Request (敏捷请求)
		api.POST("/agile-request/send", h.SendAgileRequest)
		api.GET("/agile-request/history", h.GetAgileRequestHistory)
		api.GET("/agile-request/detail", h.GetAgileRequestDetail)
		api.DELETE("/agile-request/delete", h.DeleteAgileRequestHistory)
		api.DELETE("/agile-request/clear", h.ClearAgileRequestHistory)

		// Script Hub (脚本库)
		api.GET("/scripts/categories", h.GetScriptCategories)
		api.POST("/scripts/categories", h.CreateScriptCategory)
		api.DELETE("/scripts/categories/:id", h.DeleteScriptCategory)
		api.GET("/scripts", h.GetScripts)
		api.GET("/scripts/:id", h.GetScript)
		api.POST("/scripts", h.CreateScript)
		api.PUT("/scripts/:id", h.UpdateScript)
		api.DELETE("/scripts/:id", h.DeleteScript)
		api.POST("/scripts/:id/run", h.RunScript)
		api.GET("/scripts/:id/logs", h.GetScriptLogs)

		// System Quick Open
		api.POST("/system/open", h.OpenSystemPath)

		// Dashboard Habit Items
		api.GET("/dashboard/items", h.GetDashboardItems)
		api.PUT("/dashboard/items/reorder", h.ReorderDashboardItems)
		api.POST("/dashboard/items/:id/run", h.RunDashboardItem)

		// File Manager & MinIO Storage
		api.POST("/files/upload", h.UploadFiles)
		api.GET("/files", h.GetFiles)
		api.GET("/files/:id/download", h.DownloadFile)
		api.GET("/files/:id/content", h.GetFileContent)
		api.PUT("/files/:id/content", h.UpdateFileContent)
		api.DELETE("/files/:id", h.DeleteFile)

		// Host Service & Config Management
		api.GET("/service-configs", h.GetServiceConfigs)
		api.GET("/service-configs/:id/config", h.GetServiceConfigFile)
		api.PUT("/service-configs/:id/config", h.UpdateServiceConfigFile)
		api.POST("/service-configs/:id/action", h.ExecuteServiceAction)

		// Project Services Overview (服务概览)
		api.GET("/project-directories", h.GetProjectDirectories)
		api.POST("/project-directories", h.CreateProjectDirectory)
		api.PUT("/project-directories/:id", h.UpdateProjectDirectory)
		api.DELETE("/project-directories/:id", h.DeleteProjectDirectory)
		api.GET("/project-services", h.GetProjectServices)
		api.POST("/project-services", h.CreateProjectService)
		api.PUT("/project-services/:id", h.UpdateProjectService)
		api.DELETE("/project-services/:id", h.DeleteProjectService)
	}

	return r
}
