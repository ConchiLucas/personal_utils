package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"personal_utils/server/internal/db"
	"personal_utils/server/internal/docker"
	"personal_utils/server/internal/model"
	"personal_utils/server/internal/service"
)

type Handler struct {
	dockerSvc *docker.DockerService
}

func NewHandler(dockerSvc *docker.DockerService) *Handler {
	return &Handler{
		dockerSvc: dockerSvc,
	}
}

func (h *Handler) GetHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"timestamp": time.Now().Unix(),
		"service":   "personal_utils_backend",
		"version":   "1.0.0",
	})
}

func (h *Handler) GetWorkspaces(c *gin.Context) {
	var workspaces []model.Workspace
	if err := db.DB.Order("sort_order asc, id asc").Find(&workspaces).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	counts, _ := h.dockerSvc.CountContainersByWorkspace(c.Request.Context())
	for i := range workspaces {
		slug := workspaces[i].Slug
		if c, ok := counts[slug]; ok {
			workspaces[i].ContainerCount = c
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": workspaces,
	})
}

func (h *Handler) CreateWorkspace(c *gin.Context) {
	var input model.Workspace
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	if input.Name == "" || input.Slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name and Slug are required"})
		return
	}

	if err := db.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create workspace: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    input,
		"message": "Workspace created successfully",
	})
}

func (h *Handler) DeleteWorkspace(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	var ws model.Workspace
	if err := db.DB.First(&ws, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
		return
	}

	if ws.IsDefault {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Default workspace cannot be deleted"})
		return
	}

	if err := db.DB.Delete(&ws).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Workspace deleted successfully"})
}

func (h *Handler) GetContainers(c *gin.Context) {
	workspaceSlug := c.Query("workspace")
	if workspaceSlug == "" {
		workspaceSlug = "local-dev"
	}

	containers, err := h.dockerSvc.ListContainers(c.Request.Context(), workspaceSlug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Calculate summary stats
	total := len(containers)
	running := 0
	stopped := 0
	webServices := 0

	for _, ct := range containers {
		if ct.State == "running" {
			running++
		} else {
			stopped++
		}
		if ct.WebPort != nil {
			webServices++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"workspace": workspaceSlug,
		"summary": gin.H{
			"total":        total,
			"running":      running,
			"stopped":      stopped,
			"web_services": webServices,
		},
		"data": containers,
	})
}

func (h *Handler) GetContainerLogs(c *gin.Context) {
	containerID := c.Param("id")
	tailStr := c.DefaultQuery("tail", "200")
	tail, _ := strconv.Atoi(tailStr)

	logs, err := h.dockerSvc.GetLogs(c.Request.Context(), containerID, tail)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"container_id": containerID,
		"tail":         tail,
		"logs":         logs,
	})
}

type ActionPayload struct {
	Action string `json:"action" binding:"required"` // start, stop, restart
}

func (h *Handler) ContainerAction(c *gin.Context) {
	containerID := c.Param("id")
	var payload ActionPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid action payload"})
		return
	}

	if err := h.dockerSvc.ContainerAction(c.Request.Context(), containerID, payload.Action); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"container_id": containerID,
		"action":       payload.Action,
		"status":       "success",
		"message":      fmt.Sprintf("Container %s %sed successfully", containerID, payload.Action),
	})
}

type PingRequest struct {
	Host    string `json:"host" binding:"required"`
	Port    int    `json:"port" binding:"required"`
	Timeout int    `json:"timeout"` // in ms
}

func (h *Handler) DiagnosticPing(c *gin.Context) {
	var req PingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Timeout <= 0 {
		req.Timeout = 2000
	}

	target := fmt.Sprintf("%s:%d", req.Host, req.Port)
	start := time.Now()
	conn, err := net.DialTimeout("tcp", target, time.Duration(req.Timeout)*time.Millisecond)
	latency := time.Since(start).Milliseconds()

	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"target":    target,
			"connected": false,
			"latency":   latency,
			"error":     err.Error(),
		})
		return
	}
	defer conn.Close()

	c.JSON(http.StatusOK, gin.H{
		"target":    target,
		"connected": true,
		"latency":   latency,
		"message":   "Port is open and reachable",
	})
}

// Note Handlers
func (h *Handler) GetNotes(c *gin.Context) {
	category := c.Query("category")
	query := db.DB.Model(&model.Note{})
	if category != "" && category != "All" {
		query = query.Where("category = ?", category)
	}

	var notes []model.Note
	if err := query.Order("is_pinned desc, updated_at desc").Find(&notes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": notes})
}

func (h *Handler) GetNote(c *gin.Context) {
	id := c.Param("id")
	var note model.Note
	if err := db.DB.First(&note, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": note})
}

func (h *Handler) CreateNote(c *gin.Context) {
	var input model.Note
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Title is required"})
		return
	}

	if err := db.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": input, "message": "Note created successfully"})
}

func (h *Handler) UpdateNote(c *gin.Context) {
	id := c.Param("id")
	var note model.Note
	if err := db.DB.First(&note, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
		return
	}

	var input model.Note
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	note.Title = input.Title
	note.Category = input.Category
	note.Tags = input.Tags
	note.Content = input.Content
	note.IsPinned = input.IsPinned
	note.UpdatedAt = time.Now()

	if err := db.DB.Save(&note).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": note, "message": "Note updated successfully"})
}

func (h *Handler) DeleteNote(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Delete(&model.Note{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Note deleted successfully"})
}

// ==========================================
// ⚡ Agile Request (敏捷请求) Handlers
// ==========================================

func (h *Handler) SendAgileRequest(c *gin.Context) {
	var req model.AgileRequestSendReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数不正确: " + err.Error()})
		return
	}

	method := strings.ToUpper(strings.TrimSpace(req.Method))
	if method == "" {
		method = http.MethodPost
	}

	requestURL := strings.TrimSpace(req.URL)
	if requestURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请输入请求 URL"})
		return
	}

	parsedURL, err := url.ParseRequestURI(requestURL)
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "URL 格式不正确，必须包含 http:// 或 https://"})
		return
	}

	headerMap := make(map[string]string)
	normalizedHeaders := "{}"
	if strings.TrimSpace(req.RequestHeaders) != "" {
		var generic map[string]interface{}
		if err := json.Unmarshal([]byte(req.RequestHeaders), &generic); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Headers 必须是有效的 JSON 格式"})
			return
		}
		for k, v := range generic {
			if strings.TrimSpace(k) != "" {
				headerMap[strings.TrimSpace(k)] = fmt.Sprint(v)
			}
		}
		if b, err := json.Marshal(headerMap); err == nil {
			normalizedHeaders = string(b)
		}
	}

	body := strings.TrimSpace(req.RequestBody)
	bodyBytes := []byte{}
	if body != "" {
		var jsonBody interface{}
		if err := json.Unmarshal([]byte(body), &jsonBody); err == nil {
			bodyBytes, _ = json.Marshal(jsonBody)
			body = string(bodyBytes)
		} else {
			bodyBytes = []byte(body)
		}
	}

	record := model.AgileRequestLog{
		Method:         method,
		URL:            requestURL,
		RequestHeaders: normalizedHeaders,
		RequestBody:    body,
	}

	start := time.Now()
	httpReq, err := http.NewRequest(method, requestURL, bytes.NewReader(bodyBytes))
	if err != nil {
		record.DurationMs = time.Since(start).Milliseconds()
		record.IsSuccess = 0
		record.ErrorMessage = "构建请求失败: " + err.Error()
		record.ResponseBody = fmt.Sprintf(`{"success":false,"message":%q}`, err.Error())
		db.DB.Create(&record)
		c.JSON(http.StatusOK, gin.H{"data": record, "message": "请求构建失败"})
		return
	}

	if body != "" && httpReq.Header.Get("Content-Type") == "" {
		httpReq.Header.Set("Content-Type", "application/json")
	}
	for k, v := range headerMap {
		httpReq.Header.Set(k, v)
	}

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(httpReq)
	record.DurationMs = time.Since(start).Milliseconds()

	if err != nil {
		record.IsSuccess = 0
		record.ErrorMessage = err.Error()
		record.ResponseBody = fmt.Sprintf(`{"success":false,"message":%q}`, err.Error())
		db.DB.Create(&record)
		c.JSON(http.StatusOK, gin.H{"data": record, "message": "请求发送失败"})
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	respHeaders, _ := json.Marshal(resp.Header)
	record.ResponseStatus = resp.StatusCode
	record.ResponseHeaders = string(respHeaders)

	// Format response body cleanly if JSON
	var parsedBody interface{}
	if err := json.Unmarshal(respBody, &parsedBody); err == nil {
		formatted, _ := json.MarshalIndent(parsedBody, "", "  ")
		record.ResponseBody = string(formatted)
	} else {
		record.ResponseBody = string(respBody)
	}

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		record.IsSuccess = 1
	}

	db.DB.Create(&record)
	c.JSON(http.StatusOK, gin.H{"data": record, "message": "请求完成"})
}

func (h *Handler) GetAgileRequestHistory(c *gin.Context) {
	var search model.AgileRequestSearchReq
	if err := c.ShouldBindQuery(&search); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if search.Page <= 0 {
		search.Page = 1
	}
	if search.PageSize <= 0 || search.PageSize > 200 {
		search.PageSize = 50
	}

	query := db.DB.Model(&model.AgileRequestLog{})
	if search.Method != "" {
		query = query.Where("method = ?", strings.ToUpper(search.Method))
	}
	if strings.TrimSpace(search.Keyword) != "" {
		kw := "%" + strings.TrimSpace(search.Keyword) + "%"
		query = query.Where("url LIKE ? OR request_body LIKE ?", kw, kw)
	}
	if search.IsSuccess != nil {
		query = query.Where("is_success = ?", *search.IsSuccess)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var list []model.AgileRequestLog
	offset := (search.Page - 1) * search.PageSize
	if err := query.Order("id desc").Limit(search.PageSize).Offset(offset).Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"list":      list,
			"total":     total,
			"page":      search.Page,
			"page_size": search.PageSize,
		},
		"message": "获取成功",
	})
}

func (h *Handler) GetAgileRequestDetail(c *gin.Context) {
	id := c.Query("id")
	if id == "" {
		id = c.Param("id")
	}
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id 参数不能为空"})
		return
	}

	var record model.AgileRequestLog
	if err := db.DB.First(&record, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "历史记录未找到"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": record, "message": "查询成功"})
}

func (h *Handler) DeleteAgileRequestHistory(c *gin.Context) {
	id := c.Query("id")
	if id == "" {
		id = c.Param("id")
	}
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id 参数不能为空"})
		return
	}

	if err := db.DB.Delete(&model.AgileRequestLog{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "历史删除成功"})
}

func (h *Handler) ClearAgileRequestHistory(c *gin.Context) {
	if err := db.DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&model.AgileRequestLog{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "历史记录已清空"})
}

// ==========================================
// 📜 Script Hub (脚本库) Handlers
// ==========================================

func (h *Handler) GetScriptCategories(c *gin.Context) {
	var categories []model.ScriptCategory
	if err := db.DB.Order("sort_order asc, id asc").Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Calculate counts for each category
	for i := range categories {
		var count int64
		db.DB.Model(&model.ScriptItem{}).Where("category_id = ?", categories[i].ID).Count(&count)
		categories[i].ScriptCount = int(count)
	}

	c.JSON(http.StatusOK, gin.H{"data": categories, "message": "Categories fetched successfully"})
}

func (h *Handler) CreateScriptCategory(c *gin.Context) {
	var input model.ScriptCategory
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "分类名称不能为空"})
		return
	}

	if input.Slug == "" {
		input.Slug = strings.ToLower(strings.ReplaceAll(input.Name, " ", "-"))
	}

	if err := db.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": input, "message": "Category created successfully"})
}

func (h *Handler) DeleteScriptCategory(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id 参数不能为空"})
		return
	}

	// Delete scripts belonging to this category as well
	db.DB.Where("category_id = ?", id).Delete(&model.ScriptItem{})

	if err := db.DB.Delete(&model.ScriptCategory{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Category deleted successfully"})
}

func (h *Handler) GetScripts(c *gin.Context) {
	categoryID := c.Query("category_id")
	categorySlug := c.Query("category_slug")
	keyword := strings.TrimSpace(c.Query("keyword"))
	execMode := c.Query("exec_mode")

	query := db.DB.Model(&model.ScriptItem{})

	if categoryID != "" && categoryID != "0" {
		query = query.Where("category_id = ?", categoryID)
	} else if categorySlug != "" && categorySlug != "all" {
		query = query.Where("category_slug = ?", categorySlug)
	}

	if execMode != "" {
		query = query.Where("exec_mode = ?", execMode)
	}

	if keyword != "" {
		kw := "%" + keyword + "%"
		query = query.Where("name LIKE ? OR description LIKE ? OR content LIKE ?", kw, kw, kw)
	}

	var scripts []model.ScriptItem
	if err := query.Order("id desc").Find(&scripts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": scripts, "message": "Scripts fetched successfully"})
}

func (h *Handler) GetScript(c *gin.Context) {
	id := c.Param("id")
	var script model.ScriptItem
	if err := db.DB.First(&script, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "脚本未找到"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": script, "message": "Script fetched successfully"})
}

func (h *Handler) CreateScript(c *gin.Context) {
	var input model.ScriptItem
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if strings.TrimSpace(input.Name) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "脚本名称不能为空"})
		return
	}
	if strings.TrimSpace(input.Content) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "脚本内容不能为空"})
		return
	}

	if input.ScriptType == "" {
		input.ScriptType = "bash"
	}
	if input.ExecMode == "" {
		input.ExecMode = "direct"
	}
	if input.TimeoutSec <= 0 {
		input.TimeoutSec = 60
	}

	// Resolve category slug if category_id given
	if input.CategoryID > 0 && input.CategorySlug == "" {
		var cat model.ScriptCategory
		if err := db.DB.First(&cat, input.CategoryID).Error; err == nil {
			input.CategorySlug = cat.Slug
		}
	}

	if err := db.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": input, "message": "Script created successfully"})
}

func (h *Handler) UpdateScript(c *gin.Context) {
	id := c.Param("id")
	var script model.ScriptItem
	if err := db.DB.First(&script, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "脚本未找到"})
		return
	}

	var input model.ScriptItem
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	script.Name = input.Name
	script.Description = input.Description
	script.CategoryID = input.CategoryID
	script.CategorySlug = input.CategorySlug
	script.ScriptType = input.ScriptType
	script.ExecMode = input.ExecMode
	script.Content = input.Content
	script.ParamsSchema = input.ParamsSchema
	script.DefaultParams = input.DefaultParams
	script.WorkingDir = input.WorkingDir
	if input.TimeoutSec > 0 {
		script.TimeoutSec = input.TimeoutSec
	}
	script.UpdatedAt = time.Now()

	if err := db.DB.Save(&script).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": script, "message": "Script updated successfully"})
}

func (h *Handler) DeleteScript(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Delete(&model.ScriptItem{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Script deleted successfully"})
}

func (h *Handler) RunScript(c *gin.Context) {
	id := c.Param("id")
	var script model.ScriptItem
	if err := db.DB.First(&script, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "脚本未找到"})
		return
	}

	var req model.ScriptRunReq
	_ = c.ShouldBindJSON(&req)
	if req.Params == nil {
		req.Params = make(map[string]interface{})
	}

	// Prepare script content with parameter substitution
	executableContent := script.Content
	envList := os.Environ()

	for k, v := range req.Params {
		valStr := fmt.Sprintf("%v", v)
		// Environment variables injection
		envList = append(envList, fmt.Sprintf("%s=%s", k, valStr))

		// String substitution in script body
		executableContent = strings.ReplaceAll(executableContent, "${"+k+"}", valStr)
		executableContent = strings.ReplaceAll(executableContent, "$"+k, valStr)
		executableContent = strings.ReplaceAll(executableContent, "{{"+k+"}}", valStr)
	}

	timeoutSec := script.TimeoutSec
	if timeoutSec <= 0 || timeoutSec > 600 {
		timeoutSec = 60
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSec)*time.Second)
	defer cancel()

	var cmd *exec.Cmd
	switch strings.ToLower(script.ScriptType) {
	case "python", "py":
		cmd = exec.CommandContext(ctx, "python3", "-c", executableContent)
	case "node", "js":
		cmd = exec.CommandContext(ctx, "node", "-e", executableContent)
	default:
		// Default to bash
		cmd = exec.CommandContext(ctx, "bash", "-c", executableContent)
	}

	cmd.Env = envList
	if script.WorkingDir != "" {
		cmd.Dir = script.WorkingDir
	} else {
		cmd.Dir = "/Users/conchi/workforce"
	}

	start := time.Now()
	outputBytes, err := cmd.CombinedOutput()
	durationMs := time.Since(start).Milliseconds()

	outputStr := string(outputBytes)
	exitCode := 0
	status := "success"

	if err != nil {
		status = "failed"
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else if ctx.Err() == context.DeadlineExceeded {
			exitCode = -1
			outputStr += fmt.Sprintf("\n[Antigravity Error] 脚本执行超时 (超过 %d 秒)", timeoutSec)
		} else {
			exitCode = -2
			outputStr += fmt.Sprintf("\n[Antigravity Error] %v", err)
		}
	}

	// Update Script stats and persist latest executed dynamic parameters
	paramsJSON, _ := json.Marshal(req.Params)
	if len(req.Params) > 0 {
		script.DefaultParams = string(paramsJSON)
	}

	now := time.Now()
	script.LastStatus = status
	script.LastRunAt = &now
	script.LastDurationMs = durationMs
	script.RunCount++
	db.DB.Save(&script)

	// Save Execution Log
	logRecord := model.ScriptExecutionLog{
		ScriptID:   script.ID,
		ScriptName: script.Name,
		ExecMode:   script.ExecMode,
		Params:     string(paramsJSON),
		Status:     status,
		ExitCode:   exitCode,
		Output:     outputStr,
		DurationMs: durationMs,
	}
	db.DB.Create(&logRecord)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"script_id":   script.ID,
			"script_name": script.Name,
			"status":      status,
			"exit_code":   exitCode,
			"output":      outputStr,
			"duration_ms": durationMs,
			"run_at":      now,
		},
		"message": "执行完成",
	})
}

func (h *Handler) GetScriptLogs(c *gin.Context) {
	id := c.Param("id")
	var logs []model.ScriptExecutionLog
	query := db.DB.Model(&model.ScriptExecutionLog{})
	if id != "" && id != "0" {
		query = query.Where("script_id = ?", id)
	}

	if err := query.Order("id desc").Limit(20).Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": logs, "message": "Logs fetched successfully"})
}

type OpenSystemPathReq struct {
	Path string `json:"path"`
}

func (h *Handler) OpenSystemPath(c *gin.Context) {
	var req OpenSystemPathReq
	if err := c.ShouldBindJSON(&req); err != nil || req.Path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "路径不能为空"})
		return
	}

	targetPath := req.Path
	var cmd *exec.Cmd

	if fi, err := os.Stat(targetPath); err == nil {
		if fi.IsDir() {
			// Directory: open in macOS Finder (访达)
			cmd = exec.Command("open", "-a", "Finder", targetPath)
		} else {
			// File: reveal in Finder (访达) with file selected
			cmd = exec.Command("open", "-R", targetPath)
		}
	} else {
		// If exact file does not exist, open its parent directory in Finder (访达)
		parentDir := filepath.Dir(targetPath)
		if _, pErr := os.Stat(parentDir); pErr == nil {
			cmd = exec.Command("open", "-a", "Finder", parentDir)
		} else {
			cmd = exec.Command("open", "-a", "Finder", targetPath)
		}
	}

	if err := cmd.Start(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "打开访达失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "已在访达 (Finder) 中打开"})
}

func (h *Handler) GetDashboardItems(c *gin.Context) {
	var items []model.DashboardItem
	if err := db.DB.Order("sort_order asc, id asc").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 并发极速探测常用网站连接是否已启动
	var wg sync.WaitGroup
	for i := range items {
		if items[i].Section == "website" {
			wg.Add(1)
			go func(idx int) {
				defer wg.Done()
				items[idx].IsOnline = probeURLOnline(items[idx].Content)
			}(i)
		}
	}
	wg.Wait()

	grouped := map[string][]model.DashboardItem{
		"website":  {},
		"account":  {},
		"command":  {},
		"path":     {},
		"document": {},
		"script":   {},
	}

	for _, item := range items {
		grouped[item.Section] = append(grouped[item.Section], item)
	}

	c.JSON(http.StatusOK, gin.H{"data": grouped, "message": "Dashboard items fetched successfully"})
}

// RunDashboardItem executes a script command configured in dashboard_items
func (h *Handler) RunDashboardItem(c *gin.Context) {
	id := c.Param("id")
	var item model.DashboardItem
	if err := db.DB.First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "配置项未找到"})
		return
	}

	cmdStr := strings.TrimSpace(item.Content)
	if cmdStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "脚本执行命令不能为空"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 180*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "/bin/zsh", "-c", cmdStr)
	cmd.Dir = "/Users/conchi/workforce"

	start := time.Now()
	outputBytes, err := cmd.CombinedOutput()
	durationMs := time.Since(start).Milliseconds()

	outputStr := string(outputBytes)
	status := "success"
	exitCode := 0

	if err != nil {
		status = "failed"
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else if ctx.Err() == context.DeadlineExceeded {
			exitCode = -1
			outputStr += "\n[Timeout] 脚本执行超时 (超过 180 秒)"
		} else {
			exitCode = -2
			outputStr += fmt.Sprintf("\n[Error] %v", err)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"id":          item.ID,
			"title":       item.Title,
			"command":     item.Content,
			"status":      status,
			"exit_code":   exitCode,
			"output":      outputStr,
			"duration_ms": durationMs,
			"executed_at": time.Now(),
		},
		"message": "脚本执行完成",
	})
}

func probeURLOnline(rawURL string) bool {
	u, err := url.Parse(rawURL)
	if err != nil {
		return false
	}
	host := u.Host
	if host == "" {
		host = rawURL
	}
	if !strings.Contains(host, ":") {
		if u.Scheme == "https" {
			host = host + ":443"
		} else {
			host = host + ":80"
		}
	}
	if strings.HasPrefix(host, "localhost:") {
		host = "127.0.0.1:" + strings.TrimPrefix(host, "localhost:")
	}

	conn, err := net.DialTimeout("tcp", host, 250*time.Millisecond)
	if err != nil {
		return false
	}
	_ = conn.Close()
	return true
}

// ==========================================
// File Management & MinIO Handlers
// ==========================================

func (h *Handler) UploadFiles(c *gin.Context) {
	if service.GlobalMinio == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "MinIO 服务未初始化或不可用"})
		return
	}

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无法解析上传文件: " + err.Error()})
		return
	}

	var files []*multipart.FileHeader
	if f1, ok := form.File["files"]; ok {
		files = append(files, f1...)
	}
	if f2, ok := form.File["file"]; ok {
		files = append(files, f2...)
	}

	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "未选择任何文件"})
		return
	}

	var uploadedRecords []model.FileRecord
	bucketName := service.GlobalMinio.BucketName

	for _, fileHeader := range files {
		src, err := fileHeader.Open()
		if err != nil {
			log.Printf("[Upload] Failed to open file %s: %v", fileHeader.Filename, err)
			continue
		}

		ext := strings.TrimPrefix(strings.ToLower(filepath.Ext(fileHeader.Filename)), ".")
		cleanName := filepath.Base(fileHeader.Filename)
		dateDir := time.Now().Format("20060102")
		objectKey := fmt.Sprintf("%s/%d_%s", dateDir, time.Now().UnixNano()%1000000, cleanName)

		contentType := fileHeader.Header.Get("Content-Type")
		if contentType == "" {
			contentType = "application/octet-stream"
		}

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		err = service.GlobalMinio.Upload(ctx, objectKey, src, fileHeader.Size, contentType)
		cancel()
		src.Close()

		if err != nil {
			log.Printf("[Upload] MinIO PutObject failed for %s: %v", objectKey, err)
			continue
		}

		record := model.FileRecord{
			FileName:     cleanName,
			OriginalName: cleanName,
			FileSize:     fileHeader.Size,
			MimeType:     contentType,
			Ext:          ext,
			Bucket:       bucketName,
			ObjectKey:    objectKey,
			URL:          fmt.Sprintf("/api/files/download?key=%s", url.QueryEscape(objectKey)),
		}

		if err := db.DB.Create(&record).Error; err == nil {
			record.URL = fmt.Sprintf("/api/files/%d/download", record.ID)
			db.DB.Model(&record).Update("url", record.URL)
			uploadedRecords = append(uploadedRecords, record)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    uploadedRecords,
		"message": fmt.Sprintf("成功上传 %d 个文件至 MinIO", len(uploadedRecords)),
	})
}

func (h *Handler) GetFiles(c *gin.Context) {
	keyword := c.Query("keyword")
	ext := c.Query("ext")

	query := db.DB.Model(&model.FileRecord{})
	if keyword != "" {
		query = query.Where("file_name ILIKE ?", "%"+keyword+"%")
	}
	if ext != "" && ext != "all" {
		query = query.Where("ext = ?", strings.ToLower(ext))
	}

	var files []model.FileRecord
	if err := query.Order("id desc").Find(&files).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    files,
		"message": "Files fetched successfully",
	})
}

func (h *Handler) DownloadFile(c *gin.Context) {
	if service.GlobalMinio == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "MinIO 服务不可用"})
		return
	}

	id := c.Param("id")
	var file model.FileRecord
	if err := db.DB.First(&file, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "文件记录不存在"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	object, err := service.GlobalMinio.GetObject(ctx, file.ObjectKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "无法从 MinIO 读取文件: " + err.Error()})
		return
	}
	defer object.Close()

	stat, err := object.Stat()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取文件信息失败: " + err.Error()})
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", url.PathEscape(file.FileName)))
	c.Header("Content-Type", file.MimeType)
	c.Header("Content-Length", fmt.Sprintf("%d", stat.Size))
	c.DataFromReader(http.StatusOK, stat.Size, file.MimeType, object, nil)
}

func (h *Handler) DeleteFile(c *gin.Context) {
	id := c.Param("id")
	var file model.FileRecord
	if err := db.DB.First(&file, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "文件不存在"})
		return
	}

	// Delete from MinIO
	if service.GlobalMinio != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		_ = service.GlobalMinio.Delete(ctx, file.ObjectKey)
		cancel()
	}

	// Delete from DB
	db.DB.Delete(&file)
	c.JSON(http.StatusOK, gin.H{"message": "文件已成功删除"})
}

type UpdateFileContentReq struct {
	Content string `json:"content"`
}

func (h *Handler) GetFileContent(c *gin.Context) {
	id := c.Param("id")
	var file model.FileRecord
	if err := db.DB.First(&file, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "文件不存在"})
		return
	}

	if service.GlobalMinio == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "MinIO 服务不可用"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	obj, err := service.GlobalMinio.GetObject(ctx, file.ObjectKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "无法读取 MinIO 对象: " + err.Error()})
		return
	}
	defer obj.Close()

	buf := new(bytes.Buffer)
	if _, err := io.Copy(buf, obj); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "读取文件流失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"id":        file.ID,
			"file_name": file.FileName,
			"ext":       file.Ext,
			"mime_type": file.MimeType,
			"content":   buf.String(),
		},
		"message": "Content fetched successfully",
	})
}

func (h *Handler) UpdateFileContent(c *gin.Context) {
	id := c.Param("id")
	var file model.FileRecord
	if err := db.DB.First(&file, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "文件不存在"})
		return
	}

	if service.GlobalMinio == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "MinIO 服务不可用"})
		return
	}

	var req UpdateFileContentReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求体"})
		return
	}

	contentBytes := []byte(req.Content)
	reader := bytes.NewReader(contentBytes)
	size := int64(len(contentBytes))

	contentType := file.MimeType
	if contentType == "" {
		contentType = "text/plain; charset=utf-8"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	err := service.GlobalMinio.Upload(ctx, file.ObjectKey, reader, size, contentType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存至 MinIO 失败: " + err.Error()})
		return
	}

	file.FileSize = size
	file.UpdatedAt = time.Now()
	db.DB.Save(&file)

	c.JSON(http.StatusOK, gin.H{
		"data":    file,
		"message": "文件已成功保存并同步至 MinIO",
	})
}

// ==========================================
// Host Service & Process Configuration Management
// ==========================================

// GetServiceConfigs returns all host services with live runtime process status
func (h *Handler) GetServiceConfigs(c *gin.Context) {
	var configs []model.ServiceConfig
	if err := db.DB.Order("sort_order asc, id asc").Find(&configs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取服务配置列表失败: " + err.Error()})
		return
	}

	// Populate live runtime process status for each service
	for i := range configs {
		service.PopulateRuntimeStatus(&configs[i])
	}

	c.JSON(http.StatusOK, gin.H{
		"data": configs,
	})
}

// GetServiceConfigFile reads the configuration file content from host disk
func (h *Handler) GetServiceConfigFile(c *gin.Context) {
	id := c.Param("id")
	var svc model.ServiceConfig
	if err := db.DB.First(&svc, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "服务未找到"})
		return
	}

	content, err := service.ReadConfigFile(svc.ConfigPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "读取配置文件失败: " + err.Error(),
			"path":  svc.ConfigPath,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"id":          svc.ID,
			"name":        svc.Name,
			"config_path": svc.ConfigPath,
			"content":     content,
		},
		"message": "配置文件读取成功",
	})
}

type UpdateConfigFileReq struct {
	Content string `json:"content" binding:"required"`
}

// UpdateServiceConfigFile updates the configuration file on host disk
func (h *Handler) UpdateServiceConfigFile(c *gin.Context) {
	id := c.Param("id")
	var svc model.ServiceConfig
	if err := db.DB.First(&svc, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "服务未找到"})
		return
	}

	var req UpdateConfigFileReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
		return
	}

	if err := service.SaveConfigFile(svc.ConfigPath, req.Content); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存配置文件失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "配置文件已成功保存至宿主机",
	})
}

type ServiceActionReq struct {
	Action string `json:"action" binding:"required"` // start, stop, restart
}

// ExecuteServiceAction executes start, stop, or restart command on the host
func (h *Handler) ExecuteServiceAction(c *gin.Context) {
	id := c.Param("id")
	var svc model.ServiceConfig
	if err := db.DB.First(&svc, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "服务未找到"})
		return
	}

	var req ServiceActionReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的动作参数"})
		return
	}

	var cmdStr string
	switch strings.ToLower(req.Action) {
	case "start":
		cmdStr = svc.StartCmd
	case "stop":
		cmdStr = svc.StopCmd
	case "restart":
		cmdStr = svc.RestartCmd
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "不支持的动作类型 (支持: start, stop, restart)"})
		return
	}

	if cmdStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("该服务未配置 %s 指令", req.Action)})
		return
	}

	output, err := service.ExecuteServiceAction(cmdStr)
	// Re-populate status after action
	service.PopulateRuntimeStatus(&svc)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "执行指令失败: " + err.Error(),
			"output": output,
			"data":   svc,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("服务已成功执行 %s 操作", req.Action),
		"output":  output,
		"data":    svc,
	})
}

// GetProjectDirectories returns all project workspace directories with live service status
func (h *Handler) GetProjectDirectories(c *gin.Context) {
	var dirs []model.ProjectDirectory
	if err := db.DB.Preload("Services", func(gdb *gorm.DB) *gorm.DB {
		return gdb.Order("project_services.sort_order asc, project_services.id asc")
	}).Order("sort_order asc, id asc").Find(&dirs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取项目目录列表失败: " + err.Error()})
		return
	}

	for i := range dirs {
		if _, err := os.Stat(dirs[i].Path); err == nil {
			dirs[i].PathExists = true
		} else {
			dirs[i].PathExists = false
		}

		dirs[i].TotalServices = len(dirs[i].Services)
		runningCount := 0
		for j := range dirs[i].Services {
			svc := &dirs[i].Services[j]
			svc.AbsolutePath = filepath.Join(dirs[i].Path, svc.RelativePath)
			if _, err := os.Stat(svc.AbsolutePath); err == nil {
				svc.PathExists = true
			}
			if svc.Port > 0 && service.CheckPortListening(svc.Port) {
				svc.Status = "running"
				runningCount++
			} else {
				svc.Status = "stopped"
			}
		}
		dirs[i].RunningServices = runningCount
	}

	c.JSON(http.StatusOK, gin.H{
		"data": dirs,
	})
}

// GetProjectServices returns services for a directory or all services
func (h *Handler) GetProjectServices(c *gin.Context) {
	dirID := c.Query("directory_id")
	dirSlug := c.Query("directory_slug")

	query := db.DB.Model(&model.ProjectService{})

	var parentDir model.ProjectDirectory
	if dirID != "" {
		query = query.Where("directory_id = ?", dirID)
		db.DB.First(&parentDir, dirID)
	} else if dirSlug != "" {
		if err := db.DB.Where("slug = ?", dirSlug).First(&parentDir).Error; err == nil {
			query = query.Where("directory_id = ?", parentDir.ID)
		}
	}

	var services []model.ProjectService
	if err := query.Order("sort_order asc, id asc").Find(&services).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取服务列表失败: " + err.Error()})
		return
	}

	// Cache directory paths
	dirMap := make(map[uint]string)
	if parentDir.ID != 0 {
		dirMap[parentDir.ID] = parentDir.Path
	}

	for i := range services {
		svc := &services[i]
		basePath, ok := dirMap[svc.DirectoryID]
		if !ok {
			var d model.ProjectDirectory
			if err := db.DB.First(&d, svc.DirectoryID).Error; err == nil {
				basePath = d.Path
				dirMap[svc.DirectoryID] = d.Path
			}
		}

		if basePath != "" {
			svc.AbsolutePath = filepath.Join(basePath, svc.RelativePath)
			if _, err := os.Stat(svc.AbsolutePath); err == nil {
				svc.PathExists = true
			} else {
				svc.PathExists = false
			}
		}

		if svc.Port > 0 && service.CheckPortListening(svc.Port) {
			svc.Status = "running"
		} else {
			svc.Status = "stopped"
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": services,
	})
}

// CreateProjectDirectory creates a new workspace directory
func (h *Handler) CreateProjectDirectory(c *gin.Context) {
	var dir model.ProjectDirectory
	if err := c.ShouldBindJSON(&dir); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的目录参数: " + err.Error()})
		return
	}

	if err := db.DB.Create(&dir).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建项目目录失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    dir,
		"message": "项目目录创建成功",
	})
}

// UpdateProjectDirectory updates an existing workspace directory
func (h *Handler) UpdateProjectDirectory(c *gin.Context) {
	id := c.Param("id")
	var dir model.ProjectDirectory
	if err := db.DB.First(&dir, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "项目目录未找到"})
		return
	}

	if err := c.ShouldBindJSON(&dir); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的修改参数: " + err.Error()})
		return
	}

	if err := db.DB.Save(&dir).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新项目目录失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    dir,
		"message": "项目目录更新成功",
	})
}

// DeleteProjectDirectory deletes a workspace directory and its services
func (h *Handler) DeleteProjectDirectory(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Where("directory_id = ?", id).Delete(&model.ProjectService{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除关联服务失败: " + err.Error()})
		return
	}

	if err := db.DB.Delete(&model.ProjectDirectory{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除项目目录失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "项目目录及其服务已删除",
	})
}

// CreateProjectService creates a service entry under a directory
func (h *Handler) CreateProjectService(c *gin.Context) {
	var svc model.ProjectService
	if err := c.ShouldBindJSON(&svc); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的服务参数: " + err.Error()})
		return
	}

	if err := db.DB.Create(&svc).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建服务失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    svc,
		"message": "服务创建成功",
	})
}

// UpdateProjectService updates a service entry
func (h *Handler) UpdateProjectService(c *gin.Context) {
	id := c.Param("id")
	var svc model.ProjectService
	if err := db.DB.First(&svc, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "服务未找到"})
		return
	}

	if err := c.ShouldBindJSON(&svc); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的修改参数: " + err.Error()})
		return
	}

	if err := db.DB.Save(&svc).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新服务失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    svc,
		"message": "服务更新成功",
	})
}

// DeleteProjectService deletes a service entry
func (h *Handler) DeleteProjectService(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Delete(&model.ProjectService{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除服务失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "服务删除成功",
	})
}

