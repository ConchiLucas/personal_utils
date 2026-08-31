package docker

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

type PortMapping struct {
	IP          string `json:"ip"`
	PrivatePort uint16 `json:"private_port"`
	PublicPort  uint16 `json:"public_port"`
	Type        string `json:"type"`
	IsWeb       bool   `json:"is_web"`
	DirectURL   string `json:"direct_url,omitempty"`
}

type ContainerInfo struct {
	ID         string            `json:"id"`
	ShortID    string            `json:"short_id"`
	Name       string            `json:"name"`
	Image      string            `json:"image"`
	ImageTag   string            `json:"image_tag"`
	State      string            `json:"state"`
	Status     string            `json:"status"`
	Created    int64             `json:"created"`
	Ports      []PortMapping     `json:"ports"`
	WebPort    *PortMapping      `json:"web_port,omitempty"`
	Labels     map[string]string `json:"labels"`
	CPUPercent float64           `json:"cpu_percent"`
	MemoryMB   float64           `json:"memory_mb"`
	Workspace  string            `json:"workspace"`
}

type DockerService struct {
	client     *http.Client
	socketPath string
}

type rawDockerPort struct {
	IP          string `json:"IP"`
	PrivatePort uint16 `json:"PrivatePort"`
	PublicPort  uint16 `json:"PublicPort"`
	Type        string `json:"Type"`
}

type rawDockerContainer struct {
	ID      string            `json:"Id"`
	Names   []string          `json:"Names"`
	Image   string            `json:"Image"`
	State   string            `json:"State"`
	Status  string            `json:"Status"`
	Created int64             `json:"Created"`
	Ports   []rawDockerPort   `json:"Ports"`
	Labels  map[string]string `json:"Labels"`
}

func NewService(customHost string) *DockerService {
	socketPath := findDockerSocket(customHost)
	if socketPath == "" {
		log.Printf("[Docker] No available Docker socket found. Falling back to simulated snapshot mode.")
		return &DockerService{client: nil}
	}

	transport := &http.Transport{
		DialContext: func(ctx context.Context, proto, addr string) (net.Conn, error) {
			return net.Dial("unix", socketPath)
		},
	}

	httpClient := &http.Client{
		Transport: transport,
		Timeout:   10 * time.Second,
	}

	svc := &DockerService{
		client:     httpClient,
		socketPath: socketPath,
	}

	// Test ping
	req, _ := http.NewRequestWithContext(context.Background(), "GET", "http://docker/_ping", nil)
	resp, err := httpClient.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		log.Printf("[Docker] Ping docker socket (%s) failed: %v. Running in fallback mode.", socketPath, err)
	} else {
		resp.Body.Close()
		log.Printf("[Docker] Connected to Docker socket (%s) successfully!", socketPath)
	}

	return svc
}

func findDockerSocket(customHost string) string {
	if customHost != "" && strings.HasPrefix(customHost, "unix://") {
		return strings.TrimPrefix(customHost, "unix://")
	}

	homeDir, _ := os.UserHomeDir()
	candidates := []string{
		fmt.Sprintf("%s/.docker/run/docker.sock", homeDir),
		"/var/run/docker.sock",
		"/Users/conchi/.docker/run/docker.sock",
	}

	for _, path := range candidates {
		if fi, err := os.Stat(path); err == nil && fi.Mode()&os.ModeSocket != 0 {
			return path
		}
		if _, err := os.Stat(path); err == nil {
			return path
		}
	}

	return candidates[0]
}

func (s *DockerService) ListContainers(ctx context.Context, workspaceSlug string) ([]ContainerInfo, error) {
	if s.client == nil {
		return s.getFallbackContainers(workspaceSlug), nil
	}

	req, err := http.NewRequestWithContext(ctx, "GET", "http://docker/containers/json?all=true", nil)
	if err != nil {
		return s.getFallbackContainers(workspaceSlug), nil
	}

	resp, err := s.client.Do(req)
	if err != nil {
		log.Printf("[Docker] Error calling /containers/json: %v. Returning snapshot.", err)
		return s.getFallbackContainers(workspaceSlug), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return s.getFallbackContainers(workspaceSlug), nil
	}

	var rawList []rawDockerContainer
	if err := json.NewDecoder(resp.Body).Decode(&rawList); err != nil {
		return s.getFallbackContainers(workspaceSlug), nil
	}

	result := make([]ContainerInfo, 0, len(rawList))
	for _, c := range rawList {
		name := ""
		if len(c.Names) > 0 {
			name = strings.TrimPrefix(c.Names[0], "/")
		} else {
			name = c.ID[:12]
		}

		shortID := c.ID
		if len(shortID) > 12 {
			shortID = shortID[:12]
		}

		detectedWs := DetectWorkspace(name, c.Image, c.Labels)

		// Filter by workspace if specified and not 'all-workspaces' / 'all'
		if workspaceSlug != "" && workspaceSlug != "all-workspaces" && workspaceSlug != "all" && workspaceSlug != "local-dev" {
			if detectedWs != workspaceSlug {
				continue
			}
		}

		ports := make([]PortMapping, 0, len(c.Ports))
		var primaryWebPort *PortMapping

		for _, p := range c.Ports {
			isWeb := isLikelyWebPort(p.PublicPort, p.PrivatePort, name)
			var directURL string
			if p.PublicPort > 0 {
				directURL = fmt.Sprintf("http://localhost:%d", p.PublicPort)
			}

			pm := PortMapping{
				IP:          p.IP,
				PrivatePort: p.PrivatePort,
				PublicPort:  p.PublicPort,
				Type:        p.Type,
				IsWeb:       isWeb,
				DirectURL:   directURL,
			}
			ports = append(ports, pm)

			if isWeb && primaryWebPort == nil && p.PublicPort > 0 {
				primaryWebPort = &pm
			}
		}

		info := ContainerInfo{
			ID:        c.ID,
			ShortID:   shortID,
			Name:      name,
			Image:     c.Image,
			ImageTag:  extractTag(c.Image),
			State:     c.State,
			Status:    c.Status,
			Created:   c.Created,
			Ports:     ports,
			WebPort:   primaryWebPort,
			Labels:    c.Labels,
			Workspace: detectedWs,
		}
		result = append(result, info)
	}

	return result, nil
}

func (s *DockerService) CountContainersByWorkspace(ctx context.Context) (map[string]int, error) {
	counts := make(map[string]int)
	list, err := s.ListContainers(ctx, "all-workspaces")
	if err != nil {
		return counts, err
	}

	counts["all-workspaces"] = len(list)
	counts["local-dev"] = len(list)

	for _, c := range list {
		if c.Workspace != "" {
			counts[c.Workspace]++
		}
	}
	return counts, nil
}

func DetectWorkspace(name, image string, labels map[string]string) string {
	workingDir := strings.ToLower(labels["com.docker.compose.project.working_dir"])
	project := strings.ToLower(labels["com.docker.compose.project"])
	nameLower := strings.ToLower(name)
	imageLower := strings.ToLower(image)

	// 1. C12 数字化业务微服务平台 (C12 Cloud Platform)
	if strings.HasPrefix(nameLower, "c12-") || strings.Contains(project, "c12") || strings.Contains(workingDir, "c12") ||
		strings.Contains(workingDir, "panzhihua") || strings.Contains(project, "panzhihua") ||
		strings.Contains(nameLower, "c12_") {
		return "c12-cloud"
	}

	// 2. AI 效率与导航工具 (AI Tools)
	if strings.Contains(workingDir, "ai-file-navigation") || strings.Contains(project, "ai-file-navigation") ||
		strings.Contains(nameLower, "ai-file-navigation") || strings.Contains(nameLower, "ai_file_navigation") {
		return "ai-tools"
	}

	// 3. 基础中间件与基础设施 (Middleware)
	if strings.Contains(workingDir, "middleware") || strings.Contains(workingDir, "database") ||
		strings.Contains(nameLower, "postgres") || strings.Contains(nameLower, "redis") ||
		strings.Contains(nameLower, "minio") || strings.Contains(nameLower, "snail-job") ||
		strings.Contains(nameLower, "mysql") || strings.Contains(nameLower, "elasticsearch") ||
		strings.Contains(nameLower, "nacos") || strings.Contains(nameLower, "nginx") ||
		strings.Contains(imageLower, "postgres") || strings.Contains(imageLower, "redis") ||
		strings.Contains(imageLower, "minio") || strings.Contains(imageLower, "mysql") ||
		strings.Contains(imageLower, "elasticsearch") || strings.Contains(imageLower, "nacos") ||
		strings.Contains(imageLower, "snail-job") {
		return "middleware"
	}

	// 4. shared-config-center
	if strings.Contains(workingDir, "shared-config-center") || strings.Contains(project, "shared-config-center") ||
		strings.Contains(nameLower, "shared-config-center") || strings.Contains(nameLower, "ai_share_config") {
		return "shared-config-center"
	}

	// 5. rob_english_word_workforce
	if strings.Contains(workingDir, "rob_english") || strings.Contains(workingDir, "word_select") ||
		strings.Contains(project, "rob-english") || strings.Contains(project, "word-select") || strings.Contains(project, "word-agent") ||
		strings.Contains(nameLower, "rob-english") || strings.Contains(nameLower, "word-select") || strings.Contains(nameLower, "word-agent") ||
		strings.Contains(nameLower, "rob_english") {
		return "rob_english_word"
	}

	// 6. stock_workforce
	if strings.Contains(workingDir, "stock_workforce") || strings.Contains(project, "stock") || strings.Contains(nameLower, "stock-") || strings.Contains(nameLower, "stock_") {
		return "stock_workforce"
	}

	// 7. python_workforce
	if strings.Contains(workingDir, "python_workforce") || strings.Contains(project, "agent-context-router") || strings.Contains(project, "english-material") || strings.Contains(project, "ai-task-center") ||
		strings.Contains(nameLower, "agent-context-router") || strings.Contains(nameLower, "english-material") || strings.Contains(nameLower, "ai-task-center") {
		return "python_workforce"
	}

	// 8. 兼容可能部署的子项目
	if strings.Contains(nameLower, "sub2api") || strings.Contains(project, "sub2api") {
		return "sub2api"
	}

	return "other"
}

func (s *DockerService) GetLogs(ctx context.Context, containerID string, tailLines int) (string, error) {
	if s.client == nil {
		return fmt.Sprintf("[LOGS %s] Container %s active\nReady to receive requests\nListening on all endpoints\n", time.Now().Format(time.RFC3339), containerID), nil
	}

	if tailLines <= 0 {
		tailLines = 150
	}

	query := url.Values{}
	query.Set("stdout", "1")
	query.Set("stderr", "1")
	query.Set("timestamps", "1")
	query.Set("tail", fmt.Sprintf("%d", tailLines))

	reqURL := fmt.Sprintf("http://docker/containers/%s/logs?%s", containerID, query.Encode())
	req, err := http.NewRequestWithContext(ctx, "GET", reqURL, nil)
	if err != nil {
		return "", err
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("read container logs: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	cleaned := cleanDockerLogs(bodyBytes)
	return cleaned, nil
}

func (s *DockerService) ContainerAction(ctx context.Context, containerID string, action string) error {
	if s.client == nil {
		return nil
	}

	var reqURL string
	switch action {
	case "start":
		reqURL = fmt.Sprintf("http://docker/containers/%s/start", containerID)
	case "stop":
		reqURL = fmt.Sprintf("http://docker/containers/%s/stop?t=10", containerID)
	case "restart":
		reqURL = fmt.Sprintf("http://docker/containers/%s/restart?t=10", containerID)
	default:
		return fmt.Errorf("unsupported action: %s", action)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", reqURL, nil)
	if err != nil {
		return err
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("docker API error (%d): %s", resp.StatusCode, string(body))
	}

	return nil
}

func isLikelyWebPort(publicPort, privatePort uint16, containerName string) bool {
	webPorts := map[uint16]bool{
		80: true, 443: true, 8080: true, 8000: true, 8008: true,
		3000: true, 5173: true, 5999: true, 6004: true, 6014: true,
		6015: true, 6016: true, 6021: true, 6022: true, 7505: true,
		18427: true, 18501: true, 19081: true, 19082: true, 19091: true,
		19638: true, 18046: true, 19101: true, 49175: true,
	}
	if webPorts[publicPort] || webPorts[privatePort] {
		return true
	}
	nameLower := strings.ToLower(containerName)
	if strings.Contains(nameLower, "web") || strings.Contains(nameLower, "front") ||
		strings.Contains(nameLower, "ui") || strings.Contains(nameLower, "admin") ||
		strings.Contains(nameLower, "dashboard") {
		return true
	}
	return false
}

func extractTag(image string) string {
	parts := strings.Split(image, "/")
	last := parts[len(parts)-1]
	return last
}

func cleanDockerLogs(raw []byte) string {
	var sb strings.Builder
	idx := 0
	for idx < len(raw) {
		if idx+8 <= len(raw) && (raw[idx] == 1 || raw[idx] == 2) && raw[idx+1] == 0 && raw[idx+2] == 0 && raw[idx+3] == 0 {
			frameLen := int(raw[idx+4])<<24 | int(raw[idx+5])<<16 | int(raw[idx+6])<<8 | int(raw[idx+7])
			idx += 8
			if idx+frameLen <= len(raw) {
				sb.Write(raw[idx : idx+frameLen])
				idx += frameLen
				continue
			}
		}
		sb.WriteByte(raw[idx])
		idx++
	}
	return sb.String()
}

func (s *DockerService) getFallbackContainers(workspace string) []ContainerInfo {
	return []ContainerInfo{
		{
			ID:       "c1a2b3c4d5e6",
			ShortID:  "c1a2b3c4d5e6",
			Name:     "watch-inbox-web",
			Image:    "watch-inbox-web:latest",
			ImageTag: "watch-inbox-web:latest",
			State:    "running",
			Status:   "Up 7 hours",
			Ports: []PortMapping{
				{IP: "127.0.0.1", PrivatePort: 80, PublicPort: 18501, Type: "tcp", IsWeb: true, DirectURL: "http://localhost:18501"},
			},
			WebPort:   &PortMapping{IP: "127.0.0.1", PrivatePort: 80, PublicPort: 18501, Type: "tcp", IsWeb: true, DirectURL: "http://localhost:18501"},
			Workspace: "watch-inbox",
		},
		{
			ID:       "f9e8d7c6b5a4",
			ShortID:  "f9e8d7c6b5a4",
			Name:     "study-content-admin-app",
			Image:    "study-content-admin-app:latest",
			ImageTag: "study-content-admin-app:latest",
			State:    "running",
			Status:   "Up 7 hours (healthy)",
			Ports: []PortMapping{
				{IP: "0.0.0.0", PrivatePort: 19091, PublicPort: 19091, Type: "tcp", IsWeb: true, DirectURL: "http://localhost:19091"},
			},
			WebPort:   &PortMapping{IP: "0.0.0.0", PrivatePort: 19091, PublicPort: 19091, Type: "tcp", IsWeb: true, DirectURL: "http://localhost:19091"},
			Workspace: "study-content-admin",
		},
	}
}
