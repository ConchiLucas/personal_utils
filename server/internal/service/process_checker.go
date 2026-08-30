package service

import (
	"bufio"
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"

	"personal_utils/server/internal/model"
)

type ProcessInfo struct {
	PID        int
	CPUPercent float64
	MemoryMB   float64
	Command    string
	Running    bool
}

// FindProcessByPattern scans host processes to find matching pattern
func FindProcessByPattern(pattern string) ProcessInfo {
	if pattern == "" {
		return ProcessInfo{Running: false}
	}

	cmd := exec.Command("ps", "-eo", "pid,pcpu,rss,command")
	out, err := cmd.Output()
	if err != nil {
		return ProcessInfo{Running: false}
	}

	scanner := bufio.NewScanner(bytes.NewReader(out))
	// Skip header line
	if scanner.Scan() {}

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		fields := strings.Fields(line)
		if len(fields) < 4 {
			continue
		}

		cmdText := strings.Join(fields[3:], " ")
		// Exclude grep or self process checks
		if strings.Contains(cmdText, "ps -eo") || strings.Contains(cmdText, "grep ") {
			continue
		}

		if strings.Contains(cmdText, pattern) || strings.Contains(fields[3], pattern) {
			pid, _ := strconv.Atoi(fields[0])
			cpu, _ := strconv.ParseFloat(fields[1], 64)
			rssKB, _ := strconv.ParseFloat(fields[2], 64)
			memMB := rssKB / 1024.0

			return ProcessInfo{
				PID:        pid,
				CPUPercent: cpu,
				MemoryMB:   memMB,
				Command:    cmdText,
				Running:    true,
			}
		}
	}

	return ProcessInfo{Running: false}
}

// PopulateRuntimeStatus enriches a ServiceConfig with live runtime data
func PopulateRuntimeStatus(svc *model.ServiceConfig) {
	proc := FindProcessByPattern(svc.ProcessPattern)
	if proc.Running {
		svc.Status = "running"
		svc.PID = proc.PID
		svc.CPUPercent = proc.CPUPercent
		svc.MemoryMB = proc.MemoryMB
	} else {
		svc.Status = "stopped"
		svc.PID = 0
		svc.CPUPercent = 0
		svc.MemoryMB = 0
	}

	// Check if config file exists
	if svc.ConfigPath != "" {
		if _, err := os.Stat(svc.ConfigPath); err == nil {
			svc.ConfigFileExists = true
		} else {
			svc.ConfigFileExists = false
		}
	}
}

// ReadConfigFile reads config file from host disk
func ReadConfigFile(path string) (string, error) {
	if path == "" {
		return "", fmt.Errorf("配置文件路径为空")
	}
	bytes, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// SaveConfigFile writes content to host disk
func SaveConfigFile(path string, content string) error {
	if path == "" {
		return fmt.Errorf("配置文件路径为空")
	}
	return os.WriteFile(path, []byte(content), 0644)
}

// ExecuteServiceAction runs start/stop/restart command
func ExecuteServiceAction(cmdStr string) (string, error) {
	if cmdStr == "" {
		return "", fmt.Errorf("未配置执行指令")
	}

	cmd := exec.Command("bash", "-c", cmdStr)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return string(out), fmt.Errorf("%s: %w", string(out), err)
	}
	return string(out), nil
}
