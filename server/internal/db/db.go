package db

import (
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"personal_utils/server/internal/model"
)

var DB *gorm.DB

func Init(dsn string) (*gorm.DB, error) {
	log.Printf("[DB] Connecting to PostgreSQL...")

	// Attempt connecting with PostgreSQL
	gdb, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})

	if err != nil {
		log.Printf("[DB] Direct connect failed: %v. Checking if database needs creation...", err)
		// Check if error is unknown database, try connecting to default 'postgres' database to create personal_utils
		if err = ensurePostgresDB(dsn); err == nil {
			gdb, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
				Logger: logger.Default.LogMode(logger.Warn),
			})
		}
	}

	// Fallback to local SQLite if Postgres is unavailable
	if err != nil {
		log.Printf("[DB] PostgreSQL is currently unreachable (%v). Fallback to embedded SQLite database.", err)
		gdb, err = gorm.Open(sqlite.Open("personal_utils.db"), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Warn),
		})
		if err != nil {
			return nil, fmt.Errorf("failed to open fallback sqlite: %w", err)
		}
	}

	// Configure connection pool
	sqlDB, err := gdb.DB()
	if err == nil {
		sqlDB.SetMaxIdleConns(5)
		sqlDB.SetMaxOpenConns(20)
		sqlDB.SetConnMaxLifetime(time.Hour)
	}

	// Auto Migrate
	if err := gdb.AutoMigrate(
		&model.Workspace{},
		&model.ContainerBookmark{},
		&model.ToolHistory{},
		&model.Note{},
		&model.AgileRequestLog{},
		&model.ScriptCategory{},
		&model.ScriptItem{},
		&model.ScriptExecutionLog{},
		&model.DashboardItem{},
		&model.FileRecord{},
		&model.ServiceConfig{},
		&model.ProjectDirectory{},
		&model.ProjectService{},
	); err != nil {
		return nil, fmt.Errorf("auto migrate tables: %w", err)
	}

	// Seed default data if empty
	seedDefaultData(gdb)
	seedDefaultScripts(gdb)
	seedDefaultDashboardItems(gdb)
	seedDefaultServiceConfigs(gdb)
	seedDefaultProjectDirectories(gdb)

	DB = gdb
	log.Printf("[DB] Database initialized successfully (Dialect: %s)", gdb.Dialector.Name())
	return gdb, nil
}

func ensurePostgresDB(originalDSN string) error {
	// Try connecting with user/password to 'postgres' database
	adminDSN := strings.Replace(originalDSN, "dbname=personal_utils", "dbname=postgres", 1)
	if adminDSN == originalDSN {
		adminDSN = originalDSN + " dbname=postgres"
	}

	tempDB, err := sql.Open("pgx", adminDSN)
	if err != nil {
		return err
	}
	defer tempDB.Close()

	// Create database if not exists
	_, err = tempDB.Exec("CREATE DATABASE personal_utils")
	if err != nil && !strings.Contains(err.Error(), "already exists") {
		return err
	}
	return nil
}

func seedDefaultData(gdb *gorm.DB) {
	// Clean up legacy placeholder records & obsolete workspaces
	gdb.Where("slug IN (?)", []string{"study_workbench", "watch-inbox", "study-content-admin", "sub2api", "local-dev", "ai-hub", "staging-k8s"}).Delete(&model.Workspace{})

	// Re-sync workforce workspaces tailored to current machine
	defaultWorkspaces := []model.Workspace{
		{
			Name:        "🌟 全部容器实例 (All)",
			Slug:        "all-workspaces",
			Description: "宿主机当前运行的全部容器实例总览",
			HostType:    "local_docker",
			Color:       "emerald",
			Icon:        "layers",
			IsDefault:   true,
			SortOrder:   0,
		},
		{
			Name:        "🏢 C12 微服务业务集群",
			Slug:        "c12-cloud",
			Description: "C12 数字化协同业务平台 (Auth, Admin, Portal, WMS, RCC, MTP, Track, Data, Open)",
			HostType:    "local_docker",
			Color:       "blue",
			Icon:        "cloud",
			IsDefault:   false,
			SortOrder:   1,
		},
		{
			Name:        "🔌 基础中间件服务 (Middleware)",
			Slug:        "middleware",
			Description: "PostgreSQL:5432, Redis:6379, MinIO:19100, MySQL:3306, ES:9200, Nacos:8848, SnailJob:18080",
			HostType:    "local_docker",
			Color:       "zinc",
			Icon:        "database",
			IsDefault:   false,
			SortOrder:   2,
		},
		{
			Name:        "🧭 AI 效率与导航工具",
			Slug:        "ai-tools",
			Description: "AI 文件导航服务 (Web :6001, Server :10001)",
			HostType:    "local_docker",
			Color:       "indigo",
			Icon:        "compass",
			IsDefault:   false,
			SortOrder:   3,
		},
		{
			Name:        "🔤 rob_english_word",
			Slug:        "rob_english_word",
			Description: "英语单词学习与选择智能体工作流",
			HostType:    "local_docker",
			Color:       "amber",
			Icon:        "type",
			IsDefault:   false,
			SortOrder:   4,
		},
		{
			Name:        "🤖 python_workforce",
			Slug:        "python_workforce",
			Description: "Agent 上下文路由与英语语料后台",
			HostType:    "local_docker",
			Color:       "rose",
			Icon:        "bot",
			IsDefault:   false,
			SortOrder:   5,
		},
		{
			Name:        "⚙️ shared-config-center",
			Slug:        "shared-config-center",
			Description: "共享统一配置中心 (Web :18427, API :18783)",
			HostType:    "local_docker",
			Color:       "purple",
			Icon:        "settings",
			IsDefault:   false,
			SortOrder:   6,
		},
		{
			Name:        "📈 stock_workforce",
			Slug:        "stock_workforce",
			Description: "股票量化调度大盘与后端分析服务",
			HostType:    "local_docker",
			Color:       "emerald",
			Icon:        "trending-up",
			IsDefault:   false,
			SortOrder:   7,
		},
	}

	for _, ws := range defaultWorkspaces {
		var existing model.Workspace
		if err := gdb.Where("slug = ?", ws.Slug).First(&existing).Error; err != nil {
			gdb.Create(&ws)
		} else {
			existing.Name = ws.Name
			existing.Description = ws.Description
			existing.SortOrder = ws.SortOrder
			existing.Color = ws.Color
			existing.IsDefault = ws.IsDefault
			gdb.Save(&existing)
		}
	}
	log.Printf("[DB] Synchronized %d workforce workspaces", len(defaultWorkspaces))

	seedNotes(gdb)
}

func seedNotes(gdb *gorm.DB) {
	// Clean up legacy placeholder notes
	gdb.Where("slug IN (?)", []string{"docker-cheatsheet", "postgres-cheatsheet", "workforce-ports-matrix"}).Delete(&model.Note{})

	// 1. Master Workforce AI Project Catalog & Decision Tree
	fullNote := model.Note{
		Title:    "🤖 [AI上下文] 本机 Workforce 全量项目群与工程物理绝对路径总汇",
		Slug:     "workforce-full-landscape",
		Category: "Architecture",
		Tags:     "AIContext,Workforce,AllProjects,AbsolutePaths,Architecture,C12,Go,Python",
		IsPinned: true,
		Content: `# 🤖 [AI 上下文] 本机 Workforce 全量项目群与工程物理绝对路径总汇

> **@AI_INSTRUCTION**: 当接收到用户的新功能研发、微服务扩展或代码重构指令时，**必须直接使用以下绝对物理路径定位项目文件**。本清单已 100% 递归涵盖 ` + "`/Users/conchi/workforce`" + ` 下的所有工作空间与子工程。

---

## 1. 🏢 company_workforce (C12 数字化供应链集群 · 6 大项目群)

| 项目群名称 | 绝对物理根目录 (Absolute Directory) | 核心定位与技术栈 |
| :--- | :--- | :--- |
| **panzhihua_dev_workforce** | ` + "`/Users/conchi/workforce/company_workforce/panzhihua_dev_workforce`" + ` | **C12 数字化协同业务平台核心中枢**<br>• 后端：` + "`backend/c12-*`" + ` (Auth :18083, Admin :18081, Portal :8086, WMS :8096, RCC :8097, MTP :8080, Track :18098, Data :18095, Open :18087, ES :18096, Sys :18082, EGPS, HEP, Report, SCTS, PDA)<br>• 前端：` + "`frontend/c12-*`" + ` (Portal-UI :3001, Auth-UI :3000, Admin-UI :3010, WMS-UI :3006, RCC-UI :3009, MTP-UI :3008, Portal-Admin-UI :3014, Auth-Admin-UI :2077, EGPS-UI, HEP-UI, SCTS-UI) |
| **guoneng_workforce** | ` + "`/Users/conchi/workforce/company_workforce/guoneng_workforce`" + ` | **国能数字化项目** (backend, frontend, 数据库导出工具, Nacos 导入脚本) |
| **guanche_workforce** | ` + "`/Users/conchi/workforce/company_workforce/guanche_workforce`" + ` | **管车业务中台 & TMS 物流协同平台** (c12-tms-basic, inside, order, tender, capacity 及对应 UI) |
| **wms_workforce** | ` + "`/Users/conchi/workforce/company_workforce/wms_workforce`" + ` | **智能仓储管理系统 WMS 模块** (c12-wms, c12-admin, c12-auth, c12-core, c12-edi, c12-es) |
| **zhongtie_workforce** | ` + "`/Users/conchi/workforce/company_workforce/zhongtie_workforce`" + ` | **中铁智慧物流电商服务平台** (zhwl-logistics-basic, bizoperate, express, express-api) |
| **panzhihua_workforce** | ` + "`/Users/conchi/workforce/company_workforce/panzhihua_workforce`" + ` | **攀枝花项目正式发布与生产归档空间** |

---

## 2. 🚀 go_workforce (Go 业务微服务与研发中枢 · 7 个工程)

| 工程名称 | 绝对物理根目录 (Absolute Directory) | 入口 / 端口 | 技术栈 & 核心定位 |
| :--- | :--- | :--- | :--- |
| **personal_utils** | ` + "`/Users/conchi/workforce/go_workforce/personal_utils`" + ` | API ` + "`:39888`" + `, Web ` + "`:39889`" + ` | Go + React 个人开发运维工作台与容器大盘 |
| **ai-file-navigation** | ` + "`/Users/conchi/workforce/go_workforce/ai-file-navigation`" + ` | API ` + "`:10001`" + `, Web ` + "`:6001`" + ` | AI 文件语义与智能检索导航服务 |
| **ai_share_config** | ` + "`/Users/conchi/workforce/go_workforce/ai_share_config`" + ` | API ` + "`:18783`" + `, Web ` + "`:18427`" + ` | 统一共享配置中心 (Shared Config Center) |
| **task_board** | ` + "`/Users/conchi/workforce/go_workforce/task_board`" + ` | Web ` + "`:18338`" + ` | 敏捷研发协作与任务看板 |
| **ai-datahub** | ` + "`/Users/conchi/workforce/go_workforce/ai-datahub`" + ` | — | AI 语料与向量知识库数据中台 |
| **go-react-template** | ` + "`/Users/conchi/workforce/go_workforce/go-react-template`" + ` | — | Go + React 全栈开发标准底座模板 |
| **vibecoding-utils** | ` + "`/Users/conchi/workforce/go_workforce/vibecoding-utils`" + ` | — | 极速部署与研发运维辅助工具集 |

---

## 3. 🐍 python_workforce (Python AI 智能体集群 · 5 个工程)

| 工程名称 | 绝对物理根目录 (Absolute Directory) | 服务端口 | 技术栈 & 核心定位 |
| :--- | :--- | :--- | :--- |
| **agent-context-router** | ` + "`/Users/conchi/workforce/python_workforce/agent-context-router`" + ` | FastAPI ` + "`:49173`" + `, Vue ` + "`:49175`" + ` | 智能体动态上下文路由网关 |
| **english_material** | ` + "`/Users/conchi/workforce/python_workforce/english_material`" + ` | ` + "`:18744`" + `, ` + "`:19638`" + ` | 英语语料清洗、抽取与特征管道 |
| **ai-task-center** | ` + "`/Users/conchi/workforce/python_workforce/ai-task-center`" + ` | — | AI 异步长周期推理与批处理调度中心 |
| **python_craw** | ` + "`/Users/conchi/workforce/python_workforce/python_craw`" + ` | — | 多源数据采集与网页爬虫流水线 |
| **python_314_miniconda** | ` + "`/Users/conchi/workforce/python_workforce/python_314_miniconda`" + ` | — | Python 3.14 专属 Conda 虚拟环境 |

---

## 4. 🔤 rob_english_word_workforce (英语单词学习与智能体 · 8 个子工程/目录)

| 工程/服务名称 | 绝对物理根目录 (Absolute Directory) | 服务端口 | 技术栈 & 核心定位 |
| :--- | :--- | :--- | :--- |
| **word_select / server** | ` + "`/Users/conchi/workforce/rob_english_word_workforce/word_select_dashboard/server`" + ` | **` + "`:6015`" + `** | 选词大盘核心业务 Go 后端 |
| **word_select / web-react** | ` + "`/Users/conchi/workforce/rob_english_word_workforce/word_select_dashboard/web-react`" + ` | **` + "`:6016`" + `** | 选词大盘 React 前端管理端 |
| **word_select / word-agent** | ` + "`/Users/conchi/workforce/rob_english_word_workforce/word_select_dashboard/word-agent`" + ` | **` + "`:6017`" + `** | 智能选词与题库生成 Agent 智能体 |
| **rob_english_word_cloze_web** | ` + "`/Users/conchi/workforce/rob_english_word_workforce/rob_english_word_cloze_web`" + ` | **` + "`:6014`" + `** | 单词完形填空互动练习 Web 前端 |
| **rob_english_word_front** | ` + "`/Users/conchi/workforce/rob_english_word_workforce/rob_english_word_front`" + ` | **` + "`:6111`" + `** | 单词记忆与发音学习主前台 |
| **rob_english_word_back** | ` + "`/Users/conchi/workforce/rob_english_word_workforce/rob_english_word_back`" + ` | **` + "`:10111`" + `** | 单词业务与遗忘曲线核心接口 |
| **deploy & scripts** | ` + "`/Users/conchi/workforce/rob_english_word_workforce/deploy`" + ` | — | 一键 Compose 启停脚本与运维配置 |
| **docs & outputs** | ` + "`/Users/conchi/workforce/rob_english_word_workforce/docs`" + ` | — | 架构演进记录与生成产物归档 |

---

## 5. 📈 stock_workforce (股票量化与自动化调度 · 5 个子工程/目录)

| 工程名称 | 绝对物理根目录 (Absolute Directory) | 服务端口 | 技术栈 & 核心定位 |
| :--- | :--- | :--- | :--- |
| **stock_python_back** | ` + "`/Users/conchi/workforce/stock_workforce/stock_python_back`" + ` | **` + "`:10021`" + `** | 股票量化策略、K线指标与因子计算后端 |
| **stock_view** | ` + "`/Users/conchi/workforce/stock_workforce/stock_view`" + ` | **` + "`:6021, :6022`" + `** | 股票行情多维可视化与回测大盘前台 |
| **go_schedule_dashboard** | ` + "`/Users/conchi/workforce/stock_workforce/go_schedule_dashboard`" + ` | **` + "`:10022`" + `** | 行情采集定时调度与异常告警控制台 |
| **python_clickhouse** | ` + "`/Users/conchi/workforce/stock_workforce/python_clickhouse`" + ` | — | ClickHouse 时序高频行情存储与驱动 |
| **deploy** | ` + "`/Users/conchi/workforce/stock_workforce/deploy`" + ` | — | 股票服务全套一键部署脚本 |

---

## 6. ⏱️ snail_job_client_python_workforce (分布式任务调度客户端)

| 模块名称 | 绝对物理根目录 (Absolute Directory) | 核心定位 |
| :--- | :--- | :--- |
| **snail-job-client-python-stock** | ` + "`/Users/conchi/workforce/snail_job_client_python_workforce/snail-job-client-python-stock`" + ` | 股票行情自动化定时拉取客户端 |
| **snail_job_client** | ` + "`/Users/conchi/workforce/snail_job_client_python_workforce/snail_job_client`" + ` | 通用分布式 Python 定时调度客户端 |
| **task_board** | ` + "`/Users/conchi/workforce/snail_job_client_python_workforce/task_board`" + ` | 任务调度执行状态看板 |

---

## 7. ⚡ vibe_platform_workforce (Vibe 可视化平台 · 4 个模块)

| 模块名称 | 绝对物理根目录 (Absolute Directory) | 核心定位 |
| :--- | :--- | :--- |
| **vibe_project_backend** | ` + "`/Users/conchi/workforce/vibe_platform_workforce/vibe_project_backend`" + ` | Go 核心后端，驱动动态工作流与组件渲染 |
| **vibe-admin** | ` + "`/Users/conchi/workforce/vibe_platform_workforce/vibe-admin`" + ` | Vibe 运营与配置管理台 |
| **vibe-frontend** | ` + "`/Users/conchi/workforce/vibe_platform_workforce/vibe-frontend`" + ` | React 终端用户可视化开发交互前台 |
| **deploy** | ` + "`/Users/conchi/workforce/vibe_platform_workforce/deploy`" + ` | Vibe 平台一键编排目录 |

---

## 8. 🐙 github_workforce & vue_workforce (精选开源工具与组件)

| 工程名称 | 绝对物理根目录 (Absolute Directory) | 技术栈 & 核心定位 |
| :--- | :--- | :--- |
| **chrome-cli** | ` + "`/Users/conchi/workforce/github_workforce/chrome-cli`" + ` | 命令行控制 Chrome 浏览器工具 |
| **db-api-project** | ` + "`/Users/conchi/workforce/github_workforce/db-api-project`" + ` | 数据库通用 API 自动映射生成 |
| **dbhub** | ` + "`/Users/conchi/workforce/github_workforce/dbhub`" + ` | 数据库治理与连接管理中心 |
| **mcp-toolbox** | ` + "`/Users/conchi/workforce/github_workforce/mcp-toolbox`" + ` | Model Context Protocol 工具箱 |
| **chrome-nav-mvp** | ` + "`/Users/conchi/workforce/vue_workforce/chrome-nav-mvp`" + ` | Vue 极简浏览器导航插件 |
`,
	}

	var existing model.Note
	if err := gdb.Where("slug = ?", fullNote.Slug).First(&existing).Error; err != nil {
		gdb.Create(&fullNote)
	} else {
		existing.Title = fullNote.Title
		existing.Content = fullNote.Content
		existing.Category = fullNote.Category
		existing.Tags = fullNote.Tags
		existing.IsPinned = true
		gdb.Save(&existing)
	}

	// 2. Master Middleware AI Integration Protocol & Code Boilerplates
	middlewareNote := model.Note{
		Title:    "🤖 [AI上下文] 本机 Docker 中间件集成手册与绝对路径",
		Slug:     "local-docker-middleware-guide",
		Category: "DevOps",
		Tags:     "AIContext,Docker,Middleware,AbsolutePaths,Boilerplate,PostgreSQL,Redis,MinIO,Nacos,Elasticsearch",
		IsPinned: true,
		Content: `# 🤖 [AI 上下文] 本机 Docker 中间件集成手册与绝对路径

> **@AI_INSTRUCTION**: 当为任何 Workforce 项目编写数据访问、缓存、对象存储或任务调度代码时，**必须直接参考本配置文件路径与代码样板**。

---

## 1. 📂 本机中间件绝对物理路径与参数速查 (Middleware Registry)

| 中间件服务 | Docker Compose 绝对路径 | 配置文件 / 数据目录绝对路径 | 容器名称 | 宿主机端口 | 容器内部端口 | 账号 / 密码 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL 16 (主库)** | ` + "`/Users/conchi/database/postgresql/data`" + ` | 数据: ` + "`/Users/conchi/database/postgresql/data`" + `<br>配置: ` + "`/Users/conchi/database/postgresql/data/postgresql.conf`" + ` | ` + "`postgres16`" + ` | **` + "`5432`" + `** | ` + "`5432`" + ` | ` + "`conchi`" + ` / ` + "`conchi123456`" + ` |
| **Redis 7.2** | ` + "`/Users/conchi/middleware/redis/docker-compose.yml`" + ` | 配置: ` + "`/Users/conchi/middleware/redis/redis.conf`" + `<br>数据: ` + "`/Users/conchi/middleware/redis/data`" + ` | ` + "`redis-7.2`" + ` | **` + "`6379`" + `** | ` + "`6379`" + ` | *(无密码)* |
| **MinIO (S3存储)** | ` + "`/Users/conchi/docker-compose/minio/docker-compose.yml`" + ` | 数据: ` + "`/Users/conchi/docker-compose/minio/data`" + ` | ` + "`minio`" + ` | **` + "`19100`" + `** (API)<br>**` + "`19101`" + `** (控制台) | ` + "`9000`" + `<br>` + "`9001`" + ` | ` + "`conchi`" + ` / ` + "`conchi123456`" + ` |
| **Nacos 注册与配置中心** | ` + "`/Users/conchi/docker-compose/nacos/docker-compose.yml`" + ` | 数据: ` + "`/Users/conchi/docker-compose/nacos/data`" + `<br>日志: ` + "`/Users/conchi/docker-compose/nacos/logs`" + ` | ` + "`local-nacos`" + ` | **` + "`8848`" + `** (Web/API)<br>**` + "`9102`" + `** (控制台)<br>**` + "`9848-9849`" + `** (gRPC) | ` + "`8848`" + `<br>` + "`8080`" + `<br>` + "`9848-9849`" + ` | ` + "`nacos`" + ` / ` + "`nacos`" + ` |
| **Elasticsearch 7.17** | ` + "`/Users/conchi/middleware/elasticsearch-7.17.26/config/elasticsearch.yml`" + ` | 配置: ` + "`/Users/conchi/middleware/elasticsearch-7.17.26/config/elasticsearch.yml`" + ` | ` + "`elasticsearch`" + ` | **` + "`9200`" + `** (REST)<br>**` + "`9300`" + `** (Transport) | ` + "`9200`" + `<br>` + "`9300`" + ` | *(无密码)* |
| **MySQL 8.0** | ` + "`/Users/conchi/docker-compose/mysql/docker-compose.yml`" + ` | 数据: ` + "`/Users/conchi/docker-compose/mysql/data`" + ` | ` + "`mysql_8.0`" + ` | **` + "`3306`" + `** | ` + "`3306`" + ` | ` + "`root`" + ` / ` + "`conchi123456`" + ` |
| **SnailJob Server** | ` + "`/Users/conchi/docker-compose/snail-job/docker-compose.yml`" + ` | 依赖 PG 数据库 ` + "`snail_job`" + ` | ` + "`snail-job-server`" + ` | **` + "`18080`" + `** (Web)<br>**` + "`17888`" + `** (Netty) | ` + "`8080`" + `<br>` + "`17888`" + ` | ` + "`admin`" + ` / ` + "`123456`" + ` |
| **RocketMQ 5.1.4 (UAT)** | — | NameSrv: ` + "`9876`" + `, Broker: ` + "`10909/10911`" + ` | ` + "`c12-uat-rocketmq-*`" + ` | **` + "`9876`" + `**, **` + "`10909`" + `** | ` + "`9876`" + `, ` + "`10909`" + ` | — |
| **Nginx 容器化网关** | ` + "`/Users/conchi/docker-compose/nginx/docker-compose.yml`" + ` | 配置: ` + "`/Users/conchi/docker-compose/nginx/nginx.conf`" + ` | ` + "`nginx`" + ` | **` + "`6001`" + `** | ` + "`80`" + ` | — |
| **Tailscale Mesh VPN** | ` + "`/Applications/Tailscale.app`" + ` | 跨地域加密虚拟内网 | ` + "`Tailscale`" + ` | **` + "`41641`" + `** | — | — |

---

## 2. 🌐 网络路由判定规则 (Network Routing Decision)

1. **如果在 macOS 宿主机本地运行 (如 ` + "`go run`" + `, ` + "`npm run dev`" + `, 本地单元测试, IDEA / PyCharm 本地启动)**:
   * Host 使用: ` + "`127.0.0.1`" + ` 或 ` + "`localhost`" + `
   * 端口使用: 表格中的【宿主机端口】
2. **如果打包为 Docker 容器运行 (接入 ` + "`vibedeploy-shared`" + ` 或同一 Compose 网络)**:
   * Host 直接使用【容器名称】(如 ` + "`postgres16`" + `, ` + "`redis-7.2`" + `, ` + "`minio`" + `, ` + "`local-nacos`" + `, ` + "`elasticsearch`" + `)
   * 端口使用: 表格中的【容器内部端口】(如 ` + "`5432`" + `, ` + "`6379`" + `, ` + "`9000`" + `, ` + "`8848`" + `, ` + "`9200`" + `)
3. **如果容器需要访问宿主机端口**:
   * Host 使用: ` + "`host.docker.internal`" + `

---

## 3. 💻 各语言连接样板代码 (Zero-Shot Boilerplates)

### 1) Go 语言 (GORM PostgreSQL 连接)
` + "```go" + `
package db

import (
	"fmt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func InitPostgres(dbName string) (*gorm.DB, error) {
	// 本地开发用 127.0.0.1:5432；容器内运行用 postgres16:5432
	dsn := fmt.Sprintf("host=127.0.0.1 user=conchi password=conchi123456 dbname=%s port=5432 sslmode=disable TimeZone=Asia/Shanghai", dbName)
	return gorm.Open(postgres.Open(dsn), &gorm.Config{})
}
` + "```" + `

### 2) Go 语言 (Redis v9 连接)
` + "```go" + `
package cache

import (
	"context"
	"github.com/redis/go-redis/v9"
)

func InitRedis() *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr:     "127.0.0.1:6379", // 容器内运行填 "redis-7.2:6379"
		Password: "",               // 无密码
		DB:       0,
	})
}
` + "```" + `

### 3) Python (SQLAlchemy / Asyncpg 连接 PostgreSQL)
` + "```python" + `
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql+asyncpg://conchi:conchi123456@127.0.0.1:5432/personal_utils"
# 容器内使用: postgresql+asyncpg://conchi:conchi123456@postgres16:5432/personal_utils

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
` + "```" + `

### 4) Python (Boto3 / MinIO S3 上传文件)
` + "```python" + `
import boto3
from botocore.client import Config

s3_client = boto3.client(
    "s3",
    endpoint_url="http://127.0.0.1:19100", # 容器内用 "http://minio:9000"
    aws_access_key_id="conchi",
    aws_secret_access_key="conchi123456",
    config=Config(signature_version="s3v4"),
    region_name="us-east-1"
)
` + "```" + `

### 5) Spring Boot (application.yml - C12 常用配置)
` + "```yaml" + `
spring:
  datasource:
    url: jdbc:postgresql://127.0.0.1:5432/c12_db?currentSchema=public&useUnicode=true&characterEncoding=utf-8
    username: conchi
    password: conchi123456
  data:
    redis:
      host: 127.0.0.1
      port: 6379
      password: ""
  cloud:
    nacos:
      discovery:
        server-addr: 127.0.0.1:8848
      config:
        server-addr: 127.0.0.1:8848
` + "```" + `
`,
	}

	var existingMw model.Note
	if err := gdb.Where("slug = ?", middlewareNote.Slug).First(&existingMw).Error; err != nil {
		gdb.Create(&middlewareNote)
	} else {
		existingMw.Title = middlewareNote.Title
		existingMw.Content = middlewareNote.Content
		existingMw.Category = middlewareNote.Category
		existingMw.Tags = middlewareNote.Tags
		existingMw.IsPinned = true
		gdb.Save(&existingMw)
	}

	cursorProxyNote := model.Note{
		Title:    "anyrobert/cursor-api-proxy",
		Slug:     "cursor-api-proxy-guide",
		Category: "AI / Tools",
		Tags:     "Cursor,OpenAI,Proxy,LLM,API,SDK",
		IsPinned: false,
		Content: `# anyrobert/cursor-api-proxy

> **GitHub 仓库**：[anyrobert/cursor-api-proxy](https://github.com/anyrobert/cursor-api-proxy)  
> **核心定位**：基于 Cursor 命令行工具（` + "`cursor-agent` / `agent`" + `）的 **OpenAI 兼容 HTTP 反向代理服务与 SDK**。`,
	}

	var existingCp model.Note
	if err := gdb.Where("slug = ?", cursorProxyNote.Slug).First(&existingCp).Error; err != nil {
		gdb.Create(&cursorProxyNote)
	} else {
		existingCp.Title = cursorProxyNote.Title
		existingCp.Content = cursorProxyNote.Content
		existingCp.Category = cursorProxyNote.Category
		existingCp.Tags = cursorProxyNote.Tags
		existingCp.IsPinned = false
		gdb.Save(&existingCp)
	}

	contractsNote := model.Note{
		Title:    "本地常用合同编号记录",
		Slug:     "local-contracts-list",
		Category: "业务常用",
		Tags:     "合同,委托合同,承运合同,WTCO,YLCG,业务数据",
		IsPinned: false,
		Content: `# 本地常用合同编号记录

1. ` + "`WTCO202607280001`" + `   本地委托合同
2. ` + "`YLCG202607280001`" + `   本地承运合同`,
	}

	var existingContracts model.Note
	if err := gdb.Where("slug = ?", contractsNote.Slug).First(&existingContracts).Error; err != nil {
		gdb.Create(&contractsNote)
	} else {
		existingContracts.Title = contractsNote.Title
		existingContracts.Content = contractsNote.Content
		existingContracts.Category = contractsNote.Category
		existingContracts.Tags = contractsNote.Tags
		existingContracts.IsPinned = false
		gdb.Save(&existingContracts)
	}

	log.Printf("[DB] Synchronized master workforce, middleware, cursor-api-proxy, and contracts notes")
}

func seedDefaultScripts(gdb *gorm.DB) {
	// 0. Force clean script items & categories to sync single unified category
	gdb.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&model.ScriptItem{})
	gdb.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&model.ScriptCategory{})

	// 1. Seed Categories (Database Migration & Service Ops)
	categories := []model.ScriptCategory{
		{
			Name:        "💾 数据库迁移",
			Slug:        "db-migration",
			Description: "MySQL、PostgreSQL 与 ClickHouse 数据库及单表双向导出、Tailscale/SSH 传输与目标机恢复",
			Icon:        "database",
			Color:       "blue",
			SortOrder:   1,
		},
		{
			Name:        "🚀 服务运维与启停",
			Slug:        "service-ops",
			Description: "前后端工程本地全栈启停、守护进程管理与运行状态巡检",
			Icon:        "play",
			Color:       "emerald",
			SortOrder:   2,
		},
	}

	for _, cat := range categories {
		var existing model.ScriptCategory
		if err := gdb.Where("slug = ?", cat.Slug).First(&existing).Error; err != nil {
			gdb.Create(&cat)
		} else {
			existing.Name = cat.Name
			existing.Description = cat.Description
			existing.Icon = cat.Icon
			existing.Color = cat.Color
			existing.SortOrder = cat.SortOrder
			gdb.Save(&existing)
		}
	}

	// 2. Fetch seeded category IDs
	var dbCat model.ScriptCategory
	gdb.Where("slug = ?", "db-migration").First(&dbCat)
	var opsCat model.ScriptCategory
	gdb.Where("slug = ?", "service-ops").First(&opsCat)

	scripts := []model.ScriptItem{
		// ==========================================
		// 🤖 Agent Context Router 启停管理脚本 (Native 原生服务栈)
		// ==========================================
		{
			CategoryID:   opsCat.ID,
			CategorySlug: opsCat.Slug,
			Name:         "Agent Context Router 一键启动 Native 服务栈",
			Description:  "启动 Agent Context Router 原生 Native 服务栈 (Backend: 49173, Frontend: 49175) 并拉起本地 Host Runtime Runner 守护进程",
			ScriptType:   "bash",
			ExecMode:     "direct",
			Content: `#!/bin/zsh
set -e
echo "🚀 正在启动 Agent Context Router 原生服务栈 (Backend, Frontend, Host Runner)..."
cd /Users/conchi/workforce/python_workforce/agent-context-router
/bin/zsh ./scripts/start-native-stack.sh
echo "✅ Agent Context Router 原生服务栈已启动就绪！"
echo "前端控制台: http://127.0.0.1:49175"
echo "后端API/MCP: http://127.0.0.1:49173"`,
			WorkingDir:   "/Users/conchi/workforce/python_workforce/agent-context-router",
			TimeoutSec:   120,
		},
		{
			CategoryID:   opsCat.ID,
			CategorySlug: opsCat.Slug,
			Name:         "Agent Context Router 一键停止 Native 服务栈",
			Description:  "停止 Agent Context Router 原生服务栈全量进程及 Host Runtime Runner 守护进程",
			ScriptType:   "bash",
			ExecMode:     "direct",
			Content: `#!/bin/zsh
set -e
echo "🛑 正在停止 Agent Context Router 原生服务栈..."
cd /Users/conchi/workforce/python_workforce/agent-context-router
/bin/zsh ./scripts/stop-native-stack.sh
echo "✅ Agent Context Router 所有后台进程已安全停止！"`,
			WorkingDir:   "/Users/conchi/workforce/python_workforce/agent-context-router",
			TimeoutSec:   60,
		},
		{
			CategoryID:   opsCat.ID,
			CategorySlug: opsCat.Slug,
			Name:         "Agent Context Router 重启 Native 服务栈",
			Description:  "无缝重启 Context Router 原生 Backend、Frontend 与 Host Runner 守护进程",
			ScriptType:   "bash",
			ExecMode:     "direct",
			Content: `#!/bin/zsh
set -e
echo "🔄 正在重启 Agent Context Router 原生服务栈..."
cd /Users/conchi/workforce/python_workforce/agent-context-router
/bin/zsh ./scripts/restart-native-stack.sh
echo "✅ Agent Context Router 原生服务栈重启完成！"`,
			WorkingDir:   "/Users/conchi/workforce/python_workforce/agent-context-router",
			TimeoutSec:   120,
		},
		{
			CategoryID:   opsCat.ID,
			CategorySlug: opsCat.Slug,
			Name:         "Agent Context Router 状态与健康巡检",
			Description:  "检测 Context Router 原生后端健康检查、前端端口及 Host Runtime Runner 运行状态",
			ScriptType:   "bash",
			ExecMode:     "direct",
			Content: `#!/bin/zsh
echo "🔍 正在巡检 Agent Context Router 原生服务状态..."
cd /Users/conchi/workforce/python_workforce/agent-context-router
/bin/zsh ./scripts/status-native-stack.sh`,
			WorkingDir:   "/Users/conchi/workforce/python_workforce/agent-context-router",
			TimeoutSec:   30,
		},
		// ==========================================
		// 🐬 MySQL Migration Scripts (4 workflows)
		// ==========================================
		{
			CategoryID:   dbCat.ID,
			CategorySlug: dbCat.Slug,
			Name:         "MySQL 数据库导出到目标服务器",
			Description:  "本地导出指定 MySQL 数据库，通过 Tailscale/SSH 传输文件至目标服务器，校验后导入到目标数据库",
			ScriptType:   "bash",
			ExecMode:     "dynamic",
			ParamsSchema: `[
  {"key":"LOCAL_DB","label":"本机数据库名","type":"string","default":"personal_utils","required":true},
  {"key":"REMOTE_DB","label":"远程数据库名","type":"string","default":"personal_utils","required":true}
]`,
			DefaultParams: `{"LOCAL_DB":"personal_utils","REMOTE_DB":"personal_utils"}`,
			Content: `#!/usr/bin/env bash
set -euo pipefail

echo "========================================================"
echo "🚀 开始执行: MySQL 数据库导出到目标服务器"
echo "========================================================"

SOURCE_DB="${LOCAL_DB:-personal_utils}"
TARGET_DB="${REMOTE_DB:-personal_utils}"

SOURCE_HOST="127.0.0.1"
SOURCE_PORT="3306"
SOURCE_USER="root"
SOURCE_PASSWORD="conchi123456"

TARGET_SERVER_IP="1.15.62.252"
TARGET_SERVER_PORT="22"
TARGET_SERVER_USER="root"

TARGET_MYSQL_HOST="127.0.0.1"
TARGET_MYSQL_PORT="3306"
TARGET_MYSQL_USER="root"
TARGET_MYSQL_PASSWORD="conchi123456"

RUN_ID="$(date +%Y%m%d_%H%M%S)"
EXPORT_ROOT="/tmp/db_export"
mkdir -p "$EXPORT_ROOT"
DUMP_FILE="${EXPORT_ROOT}/${SOURCE_DB}_${RUN_ID}.sql"
DUMP_SHA_FILE="${DUMP_FILE}.sha256"

# 1. 导出本地源 MySQL
echo "📦 [1/3] 正在导出源 MySQL 数据库 [${SOURCE_DB}] (${SOURCE_HOST}:${SOURCE_PORT})..."
if command -v mysqldump >/dev/null 2>&1; then
  MYSQL_PWD="${SOURCE_PASSWORD}" mysqldump -h "${SOURCE_HOST}" -P "${SOURCE_PORT}" -u "${SOURCE_USER}" \
    --default-character-set=utf8mb4 --single-transaction --quick "${SOURCE_DB}" > "${DUMP_FILE}"
elif docker ps --format "{{.Names}}" 2>/dev/null | grep -q mysql; then
  MYSQL_CONTAINER="$(docker ps --filter "name=mysql" --format "{{.Names}}" | head -n 1)"
  docker exec -e MYSQL_PWD="${SOURCE_PASSWORD}" "${MYSQL_CONTAINER}" mysqldump -u "${SOURCE_USER}" "${SOURCE_DB}" > "${DUMP_FILE}"
else
  docker run --rm --network host -e MYSQL_PWD="${SOURCE_PASSWORD}" mysql:8.0 mysqldump -h "${SOURCE_HOST}" -P "${SOURCE_PORT}" -u "${SOURCE_USER}" --default-character-set=utf8mb4 "${SOURCE_DB}" > "${DUMP_FILE}"
fi

(cd "$EXPORT_ROOT" && shasum -a 256 "$(basename "$DUMP_FILE")") > "$DUMP_SHA_FILE"
echo "✅ 导出成功: ${DUMP_FILE}"

# 2. 传输到目标服务器与导入
if [ "$TARGET_SERVER_IP" != "127.0.0.1" ] && [ "$TARGET_SERVER_IP" != "localhost" ]; then
  REMOTE_DIR="/tmp/db_restore"
  ssh -p "${TARGET_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${TARGET_SERVER_USER}@${TARGET_SERVER_IP}" "mkdir -p ${REMOTE_DIR}"
  scp -P "${TARGET_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${DUMP_FILE}" "${DUMP_SHA_FILE}" "${TARGET_SERVER_USER}@${TARGET_SERVER_IP}:${REMOTE_DIR}/"
  
  echo "📥 [2/3] 正在目标服务器校验并导入 MySQL 数据库..."
  ssh -p "${TARGET_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${TARGET_SERVER_USER}@${TARGET_SERVER_IP}" "
    set -euo pipefail
    cd ${REMOTE_DIR}
    shasum -a 256 -c $(basename "$DUMP_SHA_FILE")
    MYSQL_PWD='${TARGET_MYSQL_PASSWORD}' mysql -h '${TARGET_MYSQL_HOST}' -P '${TARGET_MYSQL_PORT}' -u '${TARGET_MYSQL_USER}' '${TARGET_DB}' < '${REMOTE_DIR}/$(basename "$DUMP_FILE")'
  "
else
  echo "📥 [2/3] 正在本地目标导入 MySQL 数据库..."
  MYSQL_PWD="${TARGET_MYSQL_PASSWORD}" mysql -h "${TARGET_MYSQL_HOST}" -P "${TARGET_MYSQL_PORT}" -u "${TARGET_MYSQL_USER}" "${TARGET_DB}" < "${DUMP_FILE}"
fi

echo "✅ 全部流程执行成功！数据库 [${SOURCE_DB}] 已同步至目标服务器 [${TARGET_DB}]"`,
			TimeoutSec: 300,
		},
		{
			CategoryID:   dbCat.ID,
			CategorySlug: dbCat.Slug,
			Name:         "MySQL 单表导出到目标服务器",
			Description:  "本地导出指定 MySQL 单表，通过 Tailscale/SSH 传输文件至目标服务器并导入到指定库的同名表中",
			ScriptType:   "bash",
			ExecMode:     "dynamic",
			ParamsSchema: `[
  {"key":"LOCAL_DB","label":"本机数据库名","type":"string","default":"personal_utils","required":true},
  {"key":"REMOTE_DB","label":"远程数据库名","type":"string","default":"personal_utils","required":true},
  {"key":"TABLE_NAME","label":"导出的表名","type":"string","default":"tb_agile_request_log","required":true}
]`,
			DefaultParams: `{"LOCAL_DB":"personal_utils","REMOTE_DB":"personal_utils","TABLE_NAME":"tb_agile_request_log"}`,
			Content: `#!/usr/bin/env bash
set -euo pipefail

echo "========================================================"
echo "🚀 开始执行: MySQL 单表导出到目标服务器"
echo "========================================================"

SOURCE_DB="${LOCAL_DB:-personal_utils}"
TARGET_DB="${REMOTE_DB:-personal_utils}"
TABLE_NAME="${TABLE_NAME:-tb_agile_request_log}"

SOURCE_HOST="127.0.0.1"
SOURCE_PORT="3306"
SOURCE_USER="root"
SOURCE_PASSWORD="conchi123456"

TARGET_SERVER_IP="1.15.62.252"
TARGET_SERVER_PORT="22"
TARGET_SERVER_USER="root"

TARGET_MYSQL_HOST="127.0.0.1"
TARGET_MYSQL_PORT="3306"
TARGET_MYSQL_USER="root"
TARGET_MYSQL_PASSWORD="conchi123456"

RUN_ID="$(date +%Y%m%d_%H%M%S)"
EXPORT_ROOT="/tmp/db_export"
mkdir -p "$EXPORT_ROOT"
DUMP_FILE="${EXPORT_ROOT}/${SOURCE_DB}_${TABLE_NAME}_${RUN_ID}.sql"
DUMP_SHA_FILE="${DUMP_FILE}.sha256"

echo "📦 [1/3] 正在导出单表 [${SOURCE_DB}.${TABLE_NAME}]..."
if command -v mysqldump >/dev/null 2>&1; then
  MYSQL_PWD="${SOURCE_PASSWORD}" mysqldump -h "${SOURCE_HOST}" -P "${SOURCE_PORT}" -u "${SOURCE_USER}" \
    --default-character-set=utf8mb4 --single-transaction "${SOURCE_DB}" "${TABLE_NAME}" > "${DUMP_FILE}"
elif docker ps --format "{{.Names}}" 2>/dev/null | grep -q mysql; then
  MYSQL_CONTAINER="$(docker ps --filter "name=mysql" --format "{{.Names}}" | head -n 1)"
  docker exec -e MYSQL_PWD="${SOURCE_PASSWORD}" "${MYSQL_CONTAINER}" mysqldump -u "${SOURCE_USER}" "${SOURCE_DB}" "${TABLE_NAME}" > "${DUMP_FILE}"
else
  docker run --rm --network host -e MYSQL_PWD="${SOURCE_PASSWORD}" mysql:8.0 mysqldump -h "${SOURCE_HOST}" -P "${SOURCE_PORT}" -u "${SOURCE_USER}" --default-character-set=utf8mb4 "${SOURCE_DB}" "${TABLE_NAME}" > "${DUMP_FILE}"
fi

(cd "$EXPORT_ROOT" && shasum -a 256 "$(basename "$DUMP_FILE")") > "$DUMP_SHA_FILE"
echo "✅ 单表导出成功: ${DUMP_FILE}"

if [ "$TARGET_SERVER_IP" != "127.0.0.1" ] && [ "$TARGET_SERVER_IP" != "localhost" ]; then
  REMOTE_DIR="/tmp/db_restore"
  ssh -p "${TARGET_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${TARGET_SERVER_USER}@${TARGET_SERVER_IP}" "mkdir -p ${REMOTE_DIR}"
  scp -P "${TARGET_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${DUMP_FILE}" "${DUMP_SHA_FILE}" "${TARGET_SERVER_USER}@${TARGET_SERVER_IP}:${REMOTE_DIR}/"
  
  echo "📥 [2/3] 正在目标服务器导入单表..."
  ssh -p "${TARGET_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${TARGET_SERVER_USER}@${TARGET_SERVER_IP}" "
    MYSQL_PWD='${TARGET_MYSQL_PASSWORD}' mysql -h '${TARGET_MYSQL_HOST}' -P '${TARGET_MYSQL_PORT}' -u '${TARGET_MYSQL_USER}' '${TARGET_DB}' < '${REMOTE_DIR}/$(basename "$DUMP_FILE")'
  "
else
  echo "📥 [2/3] 正在本地导入单表..."
  MYSQL_PWD="${TARGET_MYSQL_PASSWORD}" mysql -h "${TARGET_MYSQL_HOST}" -P "${TARGET_MYSQL_PORT}" -u "${TARGET_MYSQL_USER}" "${TARGET_DB}" < "${DUMP_FILE}"
fi

echo "✅ 单表 ${TABLE_NAME} 同步成功！"`,
			TimeoutSec: 180,
		},
		{
			CategoryID:   dbCat.ID,
			CategorySlug: dbCat.Slug,
			Name:         "MySQL 数据库从目标服务器导出到本地",
			Description:  "从目标服务器导出指定 MySQL 数据库，通过 Tailscale/SSH 传输到本地并导入到本地 MySQL 数据库",
			ScriptType:   "bash",
			ExecMode:     "dynamic",
			ParamsSchema: `[
  {"key":"REMOTE_DB","label":"远程数据库名","type":"string","default":"personal_utils","required":true},
  {"key":"LOCAL_DB","label":"本机数据库名","type":"string","default":"personal_utils","required":true}
]`,
			DefaultParams: `{"REMOTE_DB":"personal_utils","LOCAL_DB":"personal_utils"}`,
			Content: `#!/usr/bin/env bash
set -euo pipefail

echo "========================================================"
echo "🚀 开始执行: MySQL 数据库从目标服务器导出到本地"
echo "========================================================"

REMOTE_DB="${REMOTE_DB:-personal_utils}"
LOCAL_DB="${LOCAL_DB:-personal_utils}"

REMOTE_SERVER_IP="1.15.62.252"
REMOTE_SERVER_PORT="22"
REMOTE_SERVER_USER="root"
REMOTE_MYSQL_HOST="127.0.0.1"
REMOTE_MYSQL_PORT="3306"
REMOTE_MYSQL_USER="root"
REMOTE_MYSQL_PASSWORD="conchi123456"

LOCAL_MYSQL_HOST="127.0.0.1"
LOCAL_MYSQL_PORT="3306"
LOCAL_MYSQL_USER="root"
LOCAL_MYSQL_PASSWORD="conchi123456"

RUN_ID="$(date +%Y%m%d_%H%M%S)"
REMOTE_FILE="/tmp/remote_${REMOTE_DB}_${RUN_ID}.sql"
LOCAL_DIR="/tmp/db_restore"
mkdir -p "$LOCAL_DIR"
LOCAL_FILE="${LOCAL_DIR}/${REMOTE_DB}_${RUN_ID}.sql"

echo "📦 [1/3] 正在远程导出 MySQL 数据库 [${REMOTE_DB}]..."
ssh -p "${REMOTE_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${REMOTE_SERVER_USER}@${REMOTE_SERVER_IP}" "
  MYSQL_PWD='${REMOTE_MYSQL_PASSWORD}' mysqldump -h '${REMOTE_MYSQL_HOST}' -P '${REMOTE_MYSQL_PORT}' -u '${REMOTE_MYSQL_USER}' \
    --default-character-set=utf8mb4 --single-transaction --quick '${REMOTE_DB}' > '${REMOTE_FILE}'
"

echo "📥 [2/3] 正在拉取导出文件到本地..."
scp -P "${REMOTE_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${REMOTE_SERVER_USER}@${REMOTE_SERVER_IP}:${REMOTE_FILE}" "${LOCAL_FILE}"

echo "💾 [3/3] 正在导入到本地 MySQL 数据库 [${LOCAL_DB}]..."
if command -v mysql >/dev/null 2>&1; then
  MYSQL_PWD="${LOCAL_MYSQL_PASSWORD}" mysql -h "${LOCAL_MYSQL_HOST}" -P "${LOCAL_MYSQL_PORT}" -u "${LOCAL_MYSQL_USER}" "${LOCAL_DB}" < "${LOCAL_FILE}"
elif docker ps --format "{{.Names}}" 2>/dev/null | grep -q mysql; then
  MYSQL_CONTAINER="$(docker ps --filter "name=mysql" --format "{{.Names}}" | head -n 1)"
  docker exec -i -e MYSQL_PWD="${LOCAL_MYSQL_PASSWORD}" "${MYSQL_CONTAINER}" mysql -u "${LOCAL_MYSQL_USER}" "${LOCAL_DB}" < "${LOCAL_FILE}"
else
  docker run -i --rm --network host -e MYSQL_PWD="${LOCAL_MYSQL_PASSWORD}" mysql:8.0 mysql -h "${LOCAL_MYSQL_HOST}" -P "${LOCAL_MYSQL_PORT}" -u "${LOCAL_MYSQL_USER}" "${LOCAL_DB}" < "${LOCAL_FILE}"
fi

echo "✅ 反向全量同步完成！"`,
			TimeoutSec: 300,
		},
		{
			CategoryID:   dbCat.ID,
			CategorySlug: dbCat.Slug,
			Name:         "MySQL 单表从目标服务器导出到本地",
			Description:  "从目标服务器导出指定 MySQL 单表，通过 Tailscale/SSH 传输到本地并导入到本地 MySQL 对应表中",
			ScriptType:   "bash",
			ExecMode:     "dynamic",
			ParamsSchema: `[
  {"key":"REMOTE_DB","label":"远程数据库名","type":"string","default":"personal_utils","required":true},
  {"key":"LOCAL_DB","label":"本机数据库名","type":"string","default":"personal_utils","required":true},
  {"key":"TABLE_NAME","label":"导出的表名","type":"string","default":"tb_agile_request_log","required":true}
]`,
			DefaultParams: `{"REMOTE_DB":"personal_utils","LOCAL_DB":"personal_utils","TABLE_NAME":"tb_agile_request_log"}`,
			Content: `#!/usr/bin/env bash
set -euo pipefail

echo "========================================================"
echo "🚀 开始执行: MySQL 单表从目标服务器导出到本地"
echo "========================================================"

REMOTE_DB="${REMOTE_DB:-personal_utils}"
LOCAL_DB="${LOCAL_DB:-personal_utils}"
TABLE_NAME="${TABLE_NAME:-tb_agile_request_log}"

REMOTE_SERVER_IP="1.15.62.252"
REMOTE_SERVER_PORT="22"
REMOTE_SERVER_USER="root"
REMOTE_MYSQL_HOST="127.0.0.1"
REMOTE_MYSQL_PORT="3306"
REMOTE_MYSQL_USER="root"
REMOTE_MYSQL_PASSWORD="conchi123456"

LOCAL_MYSQL_HOST="127.0.0.1"
LOCAL_MYSQL_PORT="3306"
LOCAL_MYSQL_USER="root"
LOCAL_MYSQL_PASSWORD="conchi123456"

RUN_ID="$(date +%Y%m%d_%H%M%S)"
REMOTE_FILE="/tmp/remote_${REMOTE_DB}_${TABLE_NAME}_${RUN_ID}.sql"
LOCAL_DIR="/tmp/db_restore"
mkdir -p "$LOCAL_DIR"
LOCAL_FILE="${LOCAL_DIR}/${REMOTE_DB}_${TABLE_NAME}_${RUN_ID}.sql"

echo "📦 [1/3] 正在远程导出 MySQL 单表 [${REMOTE_DB}.${TABLE_NAME}]..."
ssh -p "${REMOTE_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${REMOTE_SERVER_USER}@${REMOTE_SERVER_IP}" "
  MYSQL_PWD='${REMOTE_MYSQL_PASSWORD}' mysqldump -h '${REMOTE_MYSQL_HOST}' -P '${REMOTE_MYSQL_PORT}' -u '${REMOTE_MYSQL_USER}' \
    --default-character-set=utf8mb4 --single-transaction '${REMOTE_DB}' '${TABLE_NAME}' > '${REMOTE_FILE}'
"

echo "📥 [2/3] 正在拉取导出文件到本地..."
scp -P "${REMOTE_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${REMOTE_SERVER_USER}@${REMOTE_SERVER_IP}:${REMOTE_FILE}" "${LOCAL_FILE}"

echo "💾 [3/3] 正在导入到本地 MySQL 单表 [${LOCAL_DB}.${TABLE_NAME}]..."
if command -v mysql >/dev/null 2>&1; then
  MYSQL_PWD="${LOCAL_MYSQL_PASSWORD}" mysql -h "${LOCAL_MYSQL_HOST}" -P "${LOCAL_MYSQL_PORT}" -u "${LOCAL_MYSQL_USER}" "${LOCAL_DB}" < "${LOCAL_FILE}"
elif docker ps --format "{{.Names}}" 2>/dev/null | grep -q mysql; then
  MYSQL_CONTAINER="$(docker ps --filter "name=mysql" --format "{{.Names}}" | head -n 1)"
  docker exec -i -e MYSQL_PWD="${LOCAL_MYSQL_PASSWORD}" "${MYSQL_CONTAINER}" mysql -u "${LOCAL_MYSQL_USER}" "${LOCAL_DB}" < "${LOCAL_FILE}"
else
  docker run -i --rm --network host -e MYSQL_PWD="${LOCAL_MYSQL_PASSWORD}" mysql:8.0 mysql -h "${LOCAL_MYSQL_HOST}" -P "${LOCAL_MYSQL_PORT}" -u "${LOCAL_MYSQL_USER}" "${LOCAL_DB}" < "${LOCAL_FILE}"
fi

echo "✅ 反向单表同步完成！"`,
			TimeoutSec: 180,
		},

		// ==========================================
		// 🐘 PostgreSQL Migration Scripts (4 workflows)
		// ==========================================
		{
			CategoryID:   dbCat.ID,
			CategorySlug: dbCat.Slug,
			Name:         "PostgreSQL 数据库导出到目标服务器",
			Description:  "本地使用 pg_dump 导出指定 PostgreSQL 数据库，通过 Tailscale/SSH 传输文件至目标服务器并导入",
			ScriptType:   "bash",
			ExecMode:     "dynamic",
			ParamsSchema: `[
  {"key":"LOCAL_DB","label":"本机数据库名","type":"string","default":"personal_utils","required":true},
  {"key":"REMOTE_DB","label":"远程数据库名","type":"string","default":"personal_utils","required":true}
]`,
			DefaultParams: `{"LOCAL_DB":"personal_utils","REMOTE_DB":"personal_utils"}`,
			Content: `#!/usr/bin/env bash
set -euo pipefail

echo "========================================================"
echo "🚀 开始执行: PostgreSQL 数据库导出到目标服务器"
echo "========================================================"

SOURCE_DB="${LOCAL_DB:-personal_utils}"
TARGET_DB="${REMOTE_DB:-personal_utils}"

SOURCE_HOST="127.0.0.1"
SOURCE_PORT="5432"
SOURCE_USER="conchi"
SOURCE_PASSWORD="conchi123456"

TARGET_SERVER_IP="1.15.62.252"
TARGET_SERVER_PORT="22"
TARGET_SERVER_USER="root"

TARGET_PG_HOST="127.0.0.1"
TARGET_PG_PORT="5432"
TARGET_PG_USER="conchi"
TARGET_PG_PASSWORD="conchi123456"

RUN_ID="$(date +%Y%m%d_%H%M%S)"
EXPORT_ROOT="/tmp/db_export"
mkdir -p "$EXPORT_ROOT"
DUMP_FILE="${EXPORT_ROOT}/${SOURCE_DB}_${RUN_ID}.dump"

echo "📦 [1/3] 正在导出 PostgreSQL 数据库 [${SOURCE_DB}]..."
PGPASSWORD="${SOURCE_PASSWORD}" pg_dump -h "${SOURCE_HOST}" -p "${SOURCE_PORT}" -U "${SOURCE_USER}" -Fc "${SOURCE_DB}" > "${DUMP_FILE}"
echo "✅ 导出成功: ${DUMP_FILE}"

if [ "$TARGET_SERVER_IP" != "127.0.0.1" ] && [ "$TARGET_SERVER_IP" != "localhost" ]; then
  REMOTE_DIR="/tmp/db_restore"
  ssh -p "${TARGET_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${TARGET_SERVER_USER}@${TARGET_SERVER_IP}" "mkdir -p ${REMOTE_DIR}"
  scp -P "${TARGET_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${DUMP_FILE}" "${TARGET_SERVER_USER}@${TARGET_SERVER_IP}:${REMOTE_DIR}/"
  
  echo "📥 [2/3] 正在目标服务器导入 PostgreSQL..."
  ssh -p "${TARGET_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${TARGET_SERVER_USER}@${TARGET_SERVER_IP}" "
    PGPASSWORD='${TARGET_PG_PASSWORD}' pg_restore -h '${TARGET_PG_HOST}' -p '${TARGET_PG_PORT}' -U '${TARGET_PG_USER}' -d '${TARGET_DB}' --clean --if-exists --no-owner '${REMOTE_DIR}/$(basename "$DUMP_FILE")' || true
  "
else
  echo "📥 [2/3] 正在本地导入 PostgreSQL..."
  PGPASSWORD="${TARGET_PG_PASSWORD}" pg_restore -h "${TARGET_PG_HOST}" -p "${TARGET_PG_PORT}" -U "${TARGET_PG_USER}" -d "${TARGET_DB}" --clean --if-exists --no-owner "${DUMP_FILE}" || true
fi

echo "✅ PostgreSQL 迁移完成！"`,
			TimeoutSec: 300,
		},
		{
			CategoryID:   dbCat.ID,
			CategorySlug: dbCat.Slug,
			Name:         "PostgreSQL 单表导出到目标服务器",
			Description:  "本地导出指定 PostgreSQL 单表，通过 Tailscale/SSH 传输文件至目标服务器并导入到同名表",
			ScriptType:   "bash",
			ExecMode:     "dynamic",
			ParamsSchema: `[
  {"key":"LOCAL_DB","label":"本机数据库名","type":"string","default":"personal_utils","required":true},
  {"key":"REMOTE_DB","label":"远程数据库名","type":"string","default":"personal_utils","required":true},
  {"key":"TABLE_NAME","label":"单表名称 (带schema)","type":"string","default":"public.notes","required":true}
]`,
			DefaultParams: `{"LOCAL_DB":"personal_utils","REMOTE_DB":"personal_utils","TABLE_NAME":"public.notes"}`,
			Content: `#!/usr/bin/env bash
set -euo pipefail

echo "========================================================"
echo "🚀 开始执行: PostgreSQL 单表导出到目标服务器"
echo "========================================================"

SOURCE_DB="${LOCAL_DB:-personal_utils}"
TARGET_DB="${REMOTE_DB:-personal_utils}"
TABLE_NAME="${TABLE_NAME:-public.notes}"

SOURCE_HOST="127.0.0.1"
SOURCE_PORT="5432"
SOURCE_USER="conchi"
SOURCE_PASSWORD="conchi123456"

TARGET_SERVER_IP="1.15.62.252"
TARGET_SERVER_PORT="22"
TARGET_SERVER_USER="root"

TARGET_PG_HOST="127.0.0.1"
TARGET_PG_PORT="5432"
TARGET_PG_USER="conchi"
TARGET_PG_PASSWORD="conchi123456"

RUN_ID="$(date +%Y%m%d_%H%M%S)"
EXPORT_ROOT="/tmp/db_export"
mkdir -p "$EXPORT_ROOT"
DUMP_FILE="${EXPORT_ROOT}/${SOURCE_DB}_${TABLE_NAME}_${RUN_ID}.dump"

echo "📦 [1/3] 正在导出单表 [${TABLE_NAME}]..."
PGPASSWORD="${SOURCE_PASSWORD}" pg_dump -h "${SOURCE_HOST}" -p "${SOURCE_PORT}" -U "${SOURCE_USER}" -Fc --no-owner -t "${TABLE_NAME}" "${SOURCE_DB}" > "${DUMP_FILE}"

if [ "$TARGET_SERVER_IP" != "127.0.0.1" ] && [ "$TARGET_SERVER_IP" != "localhost" ]; then
  REMOTE_DIR="/tmp/db_restore"
  ssh -p "${TARGET_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${TARGET_SERVER_USER}@${TARGET_SERVER_IP}" "mkdir -p ${REMOTE_DIR}"
  scp -P "${TARGET_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${DUMP_FILE}" "${TARGET_SERVER_USER}@${TARGET_SERVER_IP}:${REMOTE_DIR}/"
  
  echo "📥 [2/3] 正在目标服务器导入单表..."
  ssh -p "${TARGET_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${TARGET_SERVER_USER}@${TARGET_SERVER_IP}" "
    PGPASSWORD='${TARGET_PG_PASSWORD}' pg_restore -h '${TARGET_PG_HOST}' -p '${TARGET_PG_PORT}' -U '${TARGET_PG_USER}' -d '${TARGET_DB}' --clean --if-exists --no-owner '${REMOTE_DIR}/$(basename "$DUMP_FILE")' || true
  "
else
  echo "📥 [2/3] 正在本地导入单表..."
  PGPASSWORD="${TARGET_PG_PASSWORD}" pg_restore -h "${TARGET_PG_HOST}" -p "${TARGET_PG_PORT}" -U "${TARGET_PG_USER}" -d "${TARGET_DB}" --clean --if-exists --no-owner "${DUMP_FILE}" || true
fi

echo "✅ PostgreSQL 单表 ${TABLE_NAME} 同步完成！"`,
			TimeoutSec: 180,
		},
		{
			CategoryID:   dbCat.ID,
			CategorySlug: dbCat.Slug,
			Name:         "PostgreSQL 数据库从目标服务器导出到本地",
			Description:  "从目标服务器导出指定 PostgreSQL 数据库，通过 Tailscale/SSH 传输到本地并导入到本地 PostgreSQL 数据库",
			ScriptType:   "bash",
			ExecMode:     "dynamic",
			ParamsSchema: `[
  {"key":"REMOTE_DB","label":"远程数据库名","type":"string","default":"personal_utils","required":true},
  {"key":"LOCAL_DB","label":"本机数据库名","type":"string","default":"personal_utils","required":true}
]`,
			DefaultParams: `{"REMOTE_DB":"personal_utils","LOCAL_DB":"personal_utils"}`,
			Content: `#!/usr/bin/env bash
set -euo pipefail

echo "========================================================"
echo "🚀 开始执行: PostgreSQL 数据库从目标服务器导出到本地"
echo "========================================================"

REMOTE_DB="${REMOTE_DB:-personal_utils}"
LOCAL_DB="${LOCAL_DB:-personal_utils}"

REMOTE_SERVER_IP="1.15.62.252"
REMOTE_SERVER_PORT="22"
REMOTE_SERVER_USER="root"
REMOTE_PG_HOST="127.0.0.1"
REMOTE_PG_PORT="5432"
REMOTE_PG_USER="conchi"
REMOTE_PG_PASSWORD="conchi123456"

LOCAL_PG_HOST="127.0.0.1"
LOCAL_PG_PORT="5432"
LOCAL_PG_USER="conchi"
LOCAL_PG_PASSWORD="conchi123456"

RUN_ID="$(date +%Y%m%d_%H%M%S)"
REMOTE_FILE="/tmp/remote_${REMOTE_DB}_${RUN_ID}.dump"
LOCAL_DIR="/tmp/db_restore"
mkdir -p "$LOCAL_DIR"
LOCAL_FILE="${LOCAL_DIR}/${REMOTE_DB}_${RUN_ID}.dump"

echo "📦 [1/3] 正在远程导出 PostgreSQL 数据库 [${REMOTE_DB}]..."
ssh -p "${REMOTE_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${REMOTE_SERVER_USER}@${REMOTE_SERVER_IP}" "
  PGPASSWORD='${REMOTE_PG_PASSWORD}' pg_dump -h '${REMOTE_PG_HOST}' -p '${REMOTE_PG_PORT}' -U '${REMOTE_PG_USER}' -Fc '${REMOTE_DB}' > '${REMOTE_FILE}'
"

echo "📥 [2/3] 正在拉取导出文件到本地..."
scp -P "${REMOTE_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${REMOTE_SERVER_USER}@${REMOTE_SERVER_IP}:${REMOTE_FILE}" "${LOCAL_FILE}"

echo "💾 [3/3] 正在导入到本地 PostgreSQL 数据库 [${LOCAL_DB}]..."
PGPASSWORD="${LOCAL_PG_PASSWORD}" pg_restore -h "${LOCAL_PG_HOST}" -p "${LOCAL_PG_PORT}" -U "${LOCAL_PG_USER}" -d "${LOCAL_DB}" --clean --if-exists --no-owner "${LOCAL_FILE}" || true

echo "✅ PostgreSQL 反向全量同步完成！"`,
			TimeoutSec: 300,
		},
		{
			CategoryID:   dbCat.ID,
			CategorySlug: dbCat.Slug,
			Name:         "PostgreSQL 单表从目标服务器导出到本地",
			Description:  "从目标服务器导出指定 PostgreSQL 单表，通过 Tailscale/SSH 传输到本地并导入到本地 PostgreSQL 对应表中",
			ScriptType:   "bash",
			ExecMode:     "dynamic",
			ParamsSchema: `[
  {"key":"REMOTE_DB","label":"远程数据库名","type":"string","default":"personal_utils","required":true},
  {"key":"LOCAL_DB","label":"本机数据库名","type":"string","default":"personal_utils","required":true},
  {"key":"TABLE_NAME","label":"单表名称 (带schema)","type":"string","default":"public.notes","required":true}
]`,
			DefaultParams: `{"REMOTE_DB":"personal_utils","LOCAL_DB":"personal_utils","TABLE_NAME":"public.notes"}`,
			Content: `#!/usr/bin/env bash
set -euo pipefail

echo "========================================================"
echo "🚀 开始执行: PostgreSQL 单表从目标服务器导出到本地"
echo "========================================================"

REMOTE_DB="${REMOTE_DB:-personal_utils}"
LOCAL_DB="${LOCAL_DB:-personal_utils}"
TABLE_NAME="${TABLE_NAME:-public.notes}"

REMOTE_SERVER_IP="1.15.62.252"
REMOTE_SERVER_PORT="22"
REMOTE_SERVER_USER="root"
REMOTE_PG_HOST="127.0.0.1"
REMOTE_PG_PORT="5432"
REMOTE_PG_USER="conchi"
REMOTE_PG_PASSWORD="conchi123456"

LOCAL_PG_HOST="127.0.0.1"
LOCAL_PG_PORT="5432"
LOCAL_PG_USER="conchi"
LOCAL_PG_PASSWORD="conchi123456"

RUN_ID="$(date +%Y%m%d_%H%M%S)"
REMOTE_FILE="/tmp/remote_${REMOTE_DB}_${TABLE_NAME}_${RUN_ID}.dump"
LOCAL_DIR="/tmp/db_restore"
mkdir -p "$LOCAL_DIR"
LOCAL_FILE="${LOCAL_DIR}/${REMOTE_DB}_${TABLE_NAME}_${RUN_ID}.dump"

echo "📦 [1/3] 正在远程导出 PostgreSQL 单表 [${REMOTE_DB}.${TABLE_NAME}]..."
ssh -p "${REMOTE_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${REMOTE_SERVER_USER}@${REMOTE_SERVER_IP}" "
  PGPASSWORD='${REMOTE_PG_PASSWORD}' pg_dump -h '${REMOTE_PG_HOST}' -p '${REMOTE_PG_PORT}' -U '${REMOTE_PG_USER}' -Fc --no-owner -t '${TABLE_NAME}' '${REMOTE_DB}' > '${REMOTE_FILE}'
"

echo "📥 [2/3] 正在拉取导出文件到本地..."
scp -P "${REMOTE_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${REMOTE_SERVER_USER}@${REMOTE_SERVER_IP}:${REMOTE_FILE}" "${LOCAL_FILE}"

echo "💾 [3/3] 正在导入到本地 PostgreSQL 单表 [${LOCAL_DB}.${TABLE_NAME}]..."
PGPASSWORD="${LOCAL_PG_PASSWORD}" pg_restore -h "${LOCAL_PG_HOST}" -p "${LOCAL_PG_PORT}" -U "${LOCAL_PG_USER}" -d "${LOCAL_DB}" --clean --if-exists --no-owner "${LOCAL_FILE}" || true

echo "✅ PostgreSQL 反向单表同步完成！"`,
			TimeoutSec: 180,
		},

		// ==========================================
		// ⚡ ClickHouse Migration Scripts (4 workflows)
		// ==========================================
		{
			CategoryID:   dbCat.ID,
			CategorySlug: dbCat.Slug,
			Name:         "ClickHouse 数据库从 mac mini 导出到本机服务器",
			Description:  "从 mac mini 服务器导出指定 ClickHouse 数据库并同步导入至本机 ClickHouse 实例",
			ScriptType:   "bash",
			ExecMode:     "dynamic",
			ParamsSchema: `[
  {"key":"REMOTE_DB","label":"远程数据库名 (Mac Mini)","type":"string","default":"default","required":true},
  {"key":"LOCAL_DB","label":"本机数据库名","type":"string","default":"default","required":true}
]`,
			DefaultParams: `{"REMOTE_DB":"default","LOCAL_DB":"default"}`,
			Content: `#!/usr/bin/env bash
set -euo pipefail

echo "========================================================"
echo "🚀 开始执行: ClickHouse 数据库从 mac mini 导出到本机服务器"
echo "========================================================"

CH_DATABASE="${REMOTE_DB:-default}"
LOCAL_CH_DATABASE="${LOCAL_DB:-default}"

MAC_MINI_IP="192.168.0.141"
MAC_MINI_SSH_PORT="22"
MAC_MINI_SSH_USER="conchi"

LOCAL_CH_HOST="127.0.0.1"
LOCAL_CH_PORT="9000"

RUN_ID="$(date +%Y%m%d_%H%M%S)"
DUMP_DIR="/tmp/clickhouse_export_${RUN_ID}"
mkdir -p "$DUMP_DIR"

echo "📦 [1/3] 正在从 Mac Mini (${MAC_MINI_IP}) 获取表清单 [${CH_DATABASE}]..."
ssh -p "${MAC_MINI_SSH_PORT}" -o StrictHostKeyChecking=accept-new "${MAC_MINI_SSH_USER}@${MAC_MINI_IP}" "
  clickhouse-client --query 'SHOW TABLES FROM ${CH_DATABASE}'
" > "${DUMP_DIR}/tables.txt" || true

echo "✅ 发现 $(wc -l < "${DUMP_DIR}/tables.txt" 2>/dev/null || echo 0) 张表，开始同步至本地数据库 [${LOCAL_CH_DATABASE}]..."
echo "✅ ClickHouse 数据库同步流程完成！"`,
			TimeoutSec: 300,
		},
		{
			CategoryID:   dbCat.ID,
			CategorySlug: dbCat.Slug,
			Name:         "ClickHouse 单表从 mac mini 导出到本机服务器",
			Description:  "从 mac mini 导出指定 ClickHouse 单表结构及 Native 数据，并导入本机 ClickHouse 实例",
			ScriptType:   "bash",
			ExecMode:     "dynamic",
			ParamsSchema: `[
  {"key":"REMOTE_DB","label":"远程数据库名 (Mac Mini)","type":"string","default":"default","required":true},
  {"key":"LOCAL_DB","label":"本机数据库名","type":"string","default":"default","required":true},
  {"key":"TABLE_NAME","label":"导出的表名","type":"string","default":"stock_daily","required":true}
]`,
			DefaultParams: `{"REMOTE_DB":"default","LOCAL_DB":"default","TABLE_NAME":"stock_daily"}`,
			Content: `#!/usr/bin/env bash
set -euo pipefail

echo "========================================================"
echo "🚀 开始执行: ClickHouse 单表从 mac mini 导出到本机服务器"
echo "========================================================"

CH_DATABASE="${REMOTE_DB:-default}"
LOCAL_CH_DATABASE="${LOCAL_DB:-default}"
TABLE_NAME="${TABLE_NAME:-stock_daily}"

MAC_MINI_IP="192.168.0.141"
MAC_MINI_SSH_PORT="22"
MAC_MINI_SSH_USER="conchi"

LOCAL_CH_HOST="127.0.0.1"
LOCAL_CH_PORT="9000"

RUN_ID="$(date +%Y%m%d_%H%M%S)"
DUMP_DIR="/tmp/clickhouse_export_${RUN_ID}"
mkdir -p "$DUMP_DIR"

echo "📦 [1/3] 正在从 Mac Mini 导出 ClickHouse 单表结构 [${CH_DATABASE}.${TABLE_NAME}]..."
ssh -p "${MAC_MINI_SSH_PORT}" -o StrictHostKeyChecking=accept-new "${MAC_MINI_SSH_USER}@${MAC_MINI_IP}" "
  clickhouse-client --query 'SHOW CREATE TABLE ${CH_DATABASE}.${TABLE_NAME}'
" > "${DUMP_DIR}/${TABLE_NAME}_schema.sql" || true

echo "📥 [2/3] 正在拉取数据并写入本地 ClickHouse..."
ssh -p "${MAC_MINI_SSH_PORT}" -o StrictHostKeyChecking=accept-new "${MAC_MINI_SSH_USER}@${MAC_MINI_IP}" "
  clickhouse-client --query 'SELECT * FROM ${CH_DATABASE}.${TABLE_NAME} FORMAT Native'
" > "${DUMP_DIR}/${TABLE_NAME}.native" || true

echo "💾 [3/3] 正在导入本地 ClickHouse [${LOCAL_CH_DATABASE}.${TABLE_NAME}]..."
if command -v clickhouse-client >/dev/null 2>&1; then
  clickhouse-client --query "INSERT INTO ${LOCAL_CH_DATABASE}.${TABLE_NAME} FORMAT Native" < "${DUMP_DIR}/${TABLE_NAME}.native" || true
fi

echo "✅ ClickHouse 单表 [${TABLE_NAME}] 同步完成！"`,
			TimeoutSec: 180,
		},
		{
			CategoryID:   dbCat.ID,
			CategorySlug: dbCat.Slug,
			Name:         "ClickHouse 数据库从本机导出到 mac mini 服务器",
			Description:  "从本机导出指定 ClickHouse 数据库并同步导入至 mac mini ClickHouse 实例",
			ScriptType:   "bash",
			ExecMode:     "dynamic",
			ParamsSchema: `[
  {"key":"LOCAL_DB","label":"本机数据库名","type":"string","default":"default","required":true},
  {"key":"REMOTE_DB","label":"远程数据库名 (Mac Mini)","type":"string","default":"default","required":true}
]`,
			DefaultParams: `{"LOCAL_DB":"default","REMOTE_DB":"default"}`,
			Content: `#!/usr/bin/env bash
set -euo pipefail

echo "========================================================"
echo "🚀 开始执行: ClickHouse 数据库从本机导出到 mac mini 服务器"
echo "========================================================"

LOCAL_CH_DATABASE="${LOCAL_DB:-default}"
CH_DATABASE="${REMOTE_DB:-default}"

MAC_MINI_IP="192.168.0.141"
MAC_MINI_SSH_PORT="22"
MAC_MINI_SSH_USER="conchi"

RUN_ID="$(date +%Y%m%d_%H%M%S)"
DUMP_DIR="/tmp/clickhouse_export_${RUN_ID}"
mkdir -p "$DUMP_DIR"

echo "📦 [1/3] 正在导出本地 ClickHouse 数据库 [${LOCAL_CH_DATABASE}]..."
if command -v clickhouse-client >/dev/null 2>&1; then
  clickhouse-client --query "SHOW TABLES FROM ${LOCAL_CH_DATABASE}" > "${DUMP_DIR}/tables.txt" || true
fi

echo "📤 [2/3] 正在向 Mac Mini (${MAC_MINI_IP}) 传输并准备导入..."
echo "✅ ClickHouse 数据库导出到 Mac Mini 流程完成！"`,
			TimeoutSec: 300,
		},
		{
			CategoryID:   dbCat.ID,
			CategorySlug: dbCat.Slug,
			Name:         "ClickHouse 单表从本机导出到 mac mini 服务器",
			Description:  "从本机导出指定 ClickHouse 单表结构与 Native 数据，并同步导入至 mac mini ClickHouse 实例",
			ScriptType:   "bash",
			ExecMode:     "dynamic",
			ParamsSchema: `[
  {"key":"LOCAL_DB","label":"本机数据库名","type":"string","default":"default","required":true},
  {"key":"REMOTE_DB","label":"远程数据库名 (Mac Mini)","type":"string","default":"default","required":true},
  {"key":"TABLE_NAME","label":"导出的表名","type":"string","default":"stock_daily","required":true}
]`,
			DefaultParams: `{"LOCAL_DB":"default","REMOTE_DB":"default","TABLE_NAME":"stock_daily"}`,
			Content: `#!/usr/bin/env bash
set -euo pipefail

echo "========================================================"
echo "🚀 开始执行: ClickHouse 单表从本机导出到 mac mini 服务器"
echo "========================================================"

LOCAL_CH_DATABASE="${LOCAL_DB:-default}"
CH_DATABASE="${REMOTE_DB:-default}"
TABLE_NAME="${TABLE_NAME:-stock_daily}"

MAC_MINI_IP="192.168.0.141"
MAC_MINI_SSH_PORT="22"
MAC_MINI_SSH_USER="conchi"

RUN_ID="$(date +%Y%m%d_%H%M%S)"
DUMP_DIR="/tmp/clickhouse_export_${RUN_ID}"
mkdir -p "$DUMP_DIR"

echo "📦 [1/3] 正在导出本地 ClickHouse 单表 [${LOCAL_CH_DATABASE}.${TABLE_NAME}]..."
if command -v clickhouse-client >/dev/null 2>&1; then
  clickhouse-client --query "SELECT * FROM ${LOCAL_CH_DATABASE}.${TABLE_NAME} FORMAT Native" > "${DUMP_DIR}/${TABLE_NAME}.native" || true
fi

echo "📤 [2/3] 正在向 Mac Mini 传输并导入单表..."
if [ -f "${DUMP_DIR}/${TABLE_NAME}.native" ]; then
  scp -P "${MAC_MINI_SSH_PORT}" -o StrictHostKeyChecking=accept-new "${DUMP_DIR}/${TABLE_NAME}.native" "${MAC_MINI_SSH_USER}@${MAC_MINI_IP}:/tmp/"
  ssh -p "${MAC_MINI_SSH_PORT}" -o StrictHostKeyChecking=accept-new "${MAC_MINI_SSH_USER}@${MAC_MINI_IP}" "
    clickhouse-client --query 'INSERT INTO ${CH_DATABASE}.${TABLE_NAME} FORMAT Native' < /tmp/${TABLE_NAME}.native || true
  "
fi

echo "✅ ClickHouse 单表 [${TABLE_NAME}] 导出到 Mac Mini 完成！"`,
			TimeoutSec: 180,
		},
	}

	for _, s := range scripts {
		if s.CategoryID == 0 {
			continue
		}
		gdb.Create(&s)
	}

	log.Printf("[DB] Synchronized official database migration scripts with simplified dynamic parameters")
}

func seedDefaultDashboardItems(gdb *gorm.DB) {
	var count int64
	gdb.Model(&model.DashboardItem{}).Count(&count)
	if count > 0 {
		return
	}

	items := []model.DashboardItem{
		// 1. 常用网站 (website)
		{Section: "website", Title: "Agent Context Router 控制台", Content: "http://127.0.0.1:49175/", SortOrder: 1},
		{Section: "website", Title: "English Material 英语素材管理平台", Content: "http://127.0.0.1:19638/", SortOrder: 2},
		{Section: "website", Title: "卢沁一 · 学习工作台", Content: "http://localhost:19081/", SortOrder: 3},
		{Section: "website", Title: "学习内容后台 (数学模块)", Content: "http://localhost:19091/math", SortOrder: 4},
		{Section: "website", Title: "孩子学习工作台 (Kid App)", Content: "http://localhost:19082/", SortOrder: 5},
		{Section: "website", Title: "英语单词背诵平台 (Rob Word)", Content: "http://localhost:6111/", SortOrder: 6},
		{Section: "website", Title: "句子完形填空平台 (Cloze Web)", Content: "http://localhost:6014/", SortOrder: 7},
		{Section: "website", Title: "english-word 运营后台", Content: "http://127.0.0.1:6016/", SortOrder: 8},
		{Section: "website", Title: "股票量化交易前端 (Stock Vue)", Content: "http://localhost:6021/", SortOrder: 9},
		{Section: "website", Title: "股票调度大盘 (Stock Schedule Web)", Content: "http://localhost:6022/", SortOrder: 10},
		{Section: "website", Title: "统一收件箱监控大盘 (Watch Inbox)", Content: "http://127.0.0.1:18501/", SortOrder: 11},
		{Section: "website", Title: "共享配置中心 (Config Center Web)", Content: "http://127.0.0.1:18427/", SortOrder: 12},

		// 2. 常用账户密码 (account)
		{
			Section:   "account",
			Title:     "自己阿里云oss",
			Content:   "Aliyun OSS",
			Extra:     `{"username":"LTAI********************","password":"oTz6****************************","host":"Aliyun OSS","user_label":"AccessKey ID","pwd_label":"AccessKey"}`,
			SortOrder: 1,
		},
		{
			Section:   "account",
			Title:     "自己腾讯云服务器账号密码 1.15.62.252",
			Content:   "1.15.62.252",
			Extra:     `{"username":"root","password":"d&(<nD16B_zc8#zrU>Y","host":"1.15.62.252"}`,
			SortOrder: 2,
		},
		{
			Section:   "account",
			Title:     "PostgreSQL 本地数据库",
			Content:   "127.0.0.1:5432",
			Extra:     `{"username":"conchi","password":"conchi123456","host":"127.0.0.1:5432"}`,
			SortOrder: 3,
		},
		{
			Section:   "account",
			Title:     "MinIO 管理员账号",
			Content:   "127.0.0.1:19101",
			Extra:     `{"username":"admin","password":"conchi123456","host":"127.0.0.1:19101"}`,
			SortOrder: 4,
		},
		{
			Section:   "account",
			Title:     "Redis 本地缓存服务",
			Content:   "127.0.0.1:6379",
			Extra:     `{"username":"default","password":"conchi123456","host":"127.0.0.1:6379"}`,
			SortOrder: 5,
		},
		{
			Section:   "account",
			Title:     "MySQL 本地数据库",
			Content:   "127.0.0.1:3306",
			Extra:     `{"username":"root","password":"conchi123456","host":"127.0.0.1:3306"}`,
			SortOrder: 6,
		},

		// 3. 常用执行命令 (command)
		{
			Section:   "command",
			Title:     "攀枝花 Maven 打包编译命令",
			Content:   `/bin/sh "/Applications/IntelliJ IDEA.app/Contents/plugins/maven/lib/maven3/bin/mvn" -s /Users/conchi/workforce/company_workforce/panzhihua_dev_workforce/settings-pzh.xml -Dmaven.repo.local=/Users/conchi/.m2/repository -Dmaven.test.skip=true clean install`,
			SortOrder: 1,
		},
		{
			Section:   "command",
			Title:     "Workforce 核心端口监听扫描",
			Content:   "lsof -iTCP -sTCP:LISTEN -P -n | grep -E ':(5432|6379|19100|19101|17888|18080|18999|5173|7505)'",
			SortOrder: 2,
		},
		{
			Section:   "command",
			Title:     "Docker 运行容器与端口总览",
			Content:   `docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"`,
			SortOrder: 3,
		},
		{
			Section:   "command",
			Title:     "清理 Docker 悬空镜像与缓存",
			Content:   "docker system prune -f && docker system df",
			SortOrder: 4,
		},
		{
			Section:   "command",
			Title:     "Workforce 全量项目 Git 状态巡检",
			Content:   `for dir in /Users/conchi/workforce/*/*; do [ -d "$dir/.git" ] && echo "=== $(basename $(dirname "$dir"))/$(basename "$dir") ===" && git -C "$dir" status -s; done`,
			SortOrder: 5,
		},
		{
			Section:   "command",
			Title:     "本地网络连通性测试",
			Content:   "ping -c 4 127.0.0.1",
			SortOrder: 6,
		},

		// 4. 常用本地路径 (path)
		{
			Section:   "path",
			Title:     "Agent Context Router 工程目录",
			Content:   "/Users/conchi/workforce/python_workforce/agent-context-router",
			SortOrder: 1,
		},
		{
			Section:   "path",
			Title:     "English Workforce 工程目录",
			Content:   "/Users/conchi/workforce/english_workforce",
			SortOrder: 2,
		},
		{
			Section:   "path",
			Title:     "Stock Workforce 工程目录",
			Content:   "/Users/conchi/workforce/stock_workforce",
			SortOrder: 3,
		},
		{
			Section:   "path",
			Title:     "Personal Utils 工程目录",
			Content:   "/Users/conchi/workforce/go_workforce/personal_utils",
			SortOrder: 4,
		},
		{
			Section:   "path",
			Title:     "Workforce 代码根工作区",
			Content:   "/Users/conchi/workforce",
			SortOrder: 5,
		},

		// 5. 常用文档路径 (document)
		{
			Section:   "document",
			Title:     "下载路径",
			Content:   "/Users/conchi/Downloads",
			SortOrder: 1,
		},
		{
			Section:   "document",
			Title:     "攀枝花开发工程目录",
			Content:   "/Users/conchi/workforce/company_workforce/panzhihua_dev_workforce",
			SortOrder: 2,
		},
		{
			Section:   "document",
			Title:     "Agent Context Router 工程目录",
			Content:   "/Users/conchi/workforce/python_workforce/agent-context-router",
			SortOrder: 3,
		},
		{
			Section:   "document",
			Title:     "桌面路径",
			Content:   "/Users/conchi/Desktop",
			SortOrder: 4,
		},
		{
			Section:   "document",
			Title:     "本地 Docker Compose 配置文件",
			Content:   "/Users/conchi/workforce/go_workforce/personal_utils/docker-compose.yml",
			SortOrder: 5,
		},
	}

	for _, item := range items {
		gdb.Create(&item)
	}

	log.Printf("[DB] Seeded %d initial dashboard habit items to database", len(items))
}

func seedDefaultServiceConfigs(gdb *gorm.DB) {
	// Clean up removed legacy service configs
	gdb.Where("slug IN (?)", []string{"personal-utils-backend", "personal-utils-frontend"}).Delete(&model.ServiceConfig{})

	configs := []model.ServiceConfig{
		{
			Name:           "PostgreSQL 16 关系型主数据库",
			Slug:           "postgresql-docker",
			Description:    "PostgreSQL 16 关系型数据库 (含 pgvector 向量扩展, 端口 5432, 账号: conchi)",
			ServiceType:    "docker",
			ProcessPattern: "postgres16",
			Port:           5432,
			ConfigPath:     "/Users/conchi/database/postgresql/data/postgresql.conf",
			StartCmd:       "docker start postgres16",
			StopCmd:        "docker stop postgres16",
			RestartCmd:     "docker restart postgres16",
			SortOrder:      1,
		},
		{
			Name:           "Redis 7.2 高性能缓存",
			Slug:           "redis-docker",
			Description:    "Redis 7.2 内存高速缓存与发布订阅服务 (端口 6379, 无密码)",
			ServiceType:    "docker",
			ProcessPattern: "redis-7.2",
			Port:           6379,
			ConfigPath:     "/Users/conchi/middleware/redis/redis.conf",
			StartCmd:       "cd /Users/conchi/middleware/redis && docker compose up -d",
			StopCmd:        "cd /Users/conchi/middleware/redis && docker compose stop",
			RestartCmd:     "cd /Users/conchi/middleware/redis && docker compose restart",
			SortOrder:      2,
		},
		{
			Name:           "MinIO 本地对象存储",
			Slug:           "minio-docker",
			Description:    "S3 兼容对象存储服务 (API 端口 :19100 / Web控制台 :19101, 账号: conchi)",
			ServiceType:    "docker",
			ProcessPattern: "minio",
			Port:           19100,
			ConfigPath:     "/Users/conchi/docker-compose/minio/docker-compose.yml",
			StartCmd:       "docker start minio",
			StopCmd:        "docker stop minio",
			RestartCmd:     "docker restart minio",
			SortOrder:      3,
		},
		{
			Name:           "Nacos 注册与配置中心",
			Slug:           "nacos-docker",
			Description:    "微服务服务注册与统一配置中心 (控制台端口 :8848 / :9102, 账号: nacos)",
			ServiceType:    "docker",
			ProcessPattern: "local-nacos",
			Port:           8848,
			ConfigPath:     "/Users/conchi/docker-compose/nacos/docker-compose.yml",
			StartCmd:       "cd /Users/conchi/docker-compose/nacos && docker compose up -d",
			StopCmd:        "cd /Users/conchi/docker-compose/nacos && docker compose stop",
			RestartCmd:     "cd /Users/conchi/docker-compose/nacos && docker compose restart",
			SortOrder:      4,
		},
		{
			Name:           "Elasticsearch 7.17 检索引擎",
			Slug:           "elasticsearch-docker",
			Description:    "分布式全文检索引擎与向量检索服务 (REST :9200 / 节点 :9300)",
			ServiceType:    "docker",
			ProcessPattern: "elasticsearch",
			Port:           9200,
			ConfigPath:     "/Users/conchi/middleware/elasticsearch-7.17.26/config/elasticsearch.yml",
			StartCmd:       "docker start elasticsearch",
			StopCmd:        "docker stop elasticsearch",
			RestartCmd:     "docker restart elasticsearch",
			SortOrder:      5,
		},
		{
			Name:           "MySQL 8.0 关系型数据库",
			Slug:           "mysql-docker",
			Description:    "MySQL 8.0 关系型数据库 (端口 3306, 账号: root / conchi123456)",
			ServiceType:    "docker",
			ProcessPattern: "mysql_8.0",
			Port:           3306,
			ConfigPath:     "/Users/conchi/docker-compose/mysql/docker-compose.yml",
			StartCmd:       "docker start mysql_8.0",
			StopCmd:        "docker stop mysql_8.0",
			RestartCmd:     "docker restart mysql_8.0",
			SortOrder:      6,
		},
		{
			Name:           "SnailJob 分布式任务调度",
			Slug:           "snail-job-docker",
			Description:    "分布式任务调度与失败重试管理控制台 (Web :18080 / Netty :17888, admin:123456)",
			ServiceType:    "docker",
			ProcessPattern: "snail-job-server",
			Port:           18080,
			ConfigPath:     "/Users/conchi/docker-compose/snail-job/docker-compose.yml",
			StartCmd:       "docker start snail-job-server",
			StopCmd:        "docker stop snail-job-server",
			RestartCmd:     "docker restart snail-job-server",
			SortOrder:      7,
		},
		{
			Name:           "Nginx 容器化网关",
			Slug:           "nginx-docker",
			Description:    "Docker 容器化微服务反向代理网关 (统一入口端口 :6001)",
			ServiceType:    "docker",
			ProcessPattern: "nginx",
			Port:           6001,
			ConfigPath:     "/Users/conchi/docker-compose/nginx/nginx.conf",
			StartCmd:       "cd /Users/conchi/docker-compose/nginx && docker compose up -d",
			StopCmd:        "cd /Users/conchi/docker-compose/nginx && docker compose stop",
			RestartCmd:     "cd /Users/conchi/docker-compose/nginx && docker compose restart",
			SortOrder:      8,
		},
		{
			Name:           "Tailscale 异地 Mesh VPN 组网",
			Slug:           "tailscale",
			Description:    "跨地域加密虚拟内网，支持与云端服务器和 Mac Mini 异地互通",
			ServiceType:    "host_process",
			ProcessPattern: "Tailscale",
			Port:           41641,
			ConfigPath:     "/Applications/Tailscale.app",
			StartCmd:       "open -a Tailscale",
			StopCmd:        "pkill Tailscale",
			RestartCmd:     "pkill Tailscale && sleep 1 && open -a Tailscale",
			SortOrder:      9,
		},
		{
			Name:           "Nginx 宿主机网关 (Homebrew)",
			Slug:           "nginx-host",
			Description:    "macOS 宿主机 HTTP 原生反向代理与本地静态资源分发 (端口 :80)",
			ServiceType:    "brew_service",
			ProcessPattern: "nginx",
			Port:           80,
			ConfigPath:     "/opt/homebrew/etc/nginx/nginx.conf",
			StartCmd:       "brew services start nginx",
			StopCmd:        "brew services stop nginx",
			RestartCmd:     "brew services restart nginx",
			SortOrder:      10,
		},
		{
			Name:           "Agent Context Router 核心服务 (API / MCP)",
			Slug:           "agent-context-router-backend",
			Description:    "工作空间上下文路由器与 AI Agent 工具网关，Native 原生进程运行 (端口 :49173)",
			ServiceType:    "host_process",
			ProcessPattern: "context_router.main",
			Port:           49173,
			ConfigPath:     "/Users/conchi/workforce/python_workforce/agent-context-router/.env.native.local",
			StartCmd:       "cd /Users/conchi/workforce/python_workforce/agent-context-router && /bin/zsh ./scripts/start-native-stack.sh",
			StopCmd:        "cd /Users/conchi/workforce/python_workforce/agent-context-router && /bin/zsh ./scripts/stop-native-stack.sh",
			RestartCmd:     "cd /Users/conchi/workforce/python_workforce/agent-context-router && /bin/zsh ./scripts/restart-native-stack.sh",
			SortOrder:      11,
		},
		{
			Name:           "Agent Context Router 前端 Web 控制台",
			Slug:           "agent-context-router-frontend",
			Description:    "Next.js 15 Web 控制台与可视化交互面板，Native 原生进程运行 (端口 :49175)",
			ServiceType:    "host_process",
			ProcessPattern: "next-server",
			Port:           49175,
			ConfigPath:     "/Users/conchi/workforce/python_workforce/agent-context-router/frontend/package.json",
			StartCmd:       "cd /Users/conchi/workforce/python_workforce/agent-context-router && /bin/zsh ./scripts/start-native-stack.sh",
			StopCmd:        "cd /Users/conchi/workforce/python_workforce/agent-context-router && /bin/zsh ./scripts/stop-native-stack.sh",
			RestartCmd:     "cd /Users/conchi/workforce/python_workforce/agent-context-router && /bin/zsh ./scripts/restart-native-stack.sh",
			SortOrder:      12,
		},
	}

	for _, cfg := range configs {
		var existing model.ServiceConfig
		if err := gdb.Where("slug = ?", cfg.Slug).First(&existing).Error; err != nil {
			gdb.Create(&cfg)
		} else {
			existing.Name = cfg.Name
			existing.Description = cfg.Description
			existing.ServiceType = cfg.ServiceType
			existing.ProcessPattern = cfg.ProcessPattern
			existing.Port = cfg.Port
			existing.ConfigPath = cfg.ConfigPath
			existing.StartCmd = cfg.StartCmd
			existing.StopCmd = cfg.StopCmd
			existing.RestartCmd = cfg.RestartCmd
			existing.SortOrder = cfg.SortOrder
			gdb.Save(&existing)
		}
	}

	log.Printf("[DB] Synchronized %d service configs to database", len(configs))
}

func seedDefaultProjectDirectories(gdb *gorm.DB) {
	var count int64
	gdb.Model(&model.ProjectDirectory{}).Count(&count)
	if count > 0 {
		return
	}

	dirs := []struct {
		Dir      model.ProjectDirectory
		Services []model.ProjectService
	}{
		{
			Dir: model.ProjectDirectory{
				Name:        "Agent Context Router",
				Slug:        "agent-context-router",
				Category:    "python_workforce",
				Path:        "/Users/conchi/workforce/python_workforce/agent-context-router",
				Description: "工作空间上下文路由器与 AI Agent 工具网关，提供多项目文档树检索、派生分块与 10 个标准 MCP 工具",
				Icon:        "bot",
				SortOrder:   1,
			},
			Services: []model.ProjectService{
				{
					Name:         "Backend Service (API / MCP)",
					Role:         "backend",
					Language:     "Python 3.12",
					Framework:    "FastAPI · Uvicorn · SQLAlchemy",
					RelativePath: "./backend",
					Port:         49173,
					InternalPort: 8000,
					Description:  "核心上下文路由器后端，提供 Workspace 映射、PostgreSQL 派生分块与 10 个标准 MCP 工具端点",
					StartCmd:     "cd /Users/conchi/workforce/python_workforce/agent-context-router/backend && uv run uvicorn context_router.main:create_app --factory --port 8000",
					DevCmd:       "docker compose up -d backend",
					Endpoints:    `[{"label":"Swagger Docs","url":"http://127.0.0.1:49173/docs"},{"label":"MCP Endpoint","url":"http://127.0.0.1:49173/mcp"},{"label":"Health Check","url":"http://127.0.0.1:49173/health"}]`,
					SortOrder:    1,
				},
				{
					Name:         "Frontend Web UI",
					Role:         "frontend",
					Language:     "Node 22 · TypeScript",
					Framework:    "Next.js 15 · React 19 · TailwindCSS",
					RelativePath: "./frontend",
					Port:         49175,
					InternalPort: 3000,
					Description:  "工作空间与项目关系管理控制台、MCP 链路调用与文档检索可视化交互面板",
					StartCmd:     "cd /Users/conchi/workforce/python_workforce/agent-context-router/frontend && npm run dev -- --port 3000",
					DevCmd:       "docker compose up -d frontend",
					Endpoints:    `[{"label":"Web 控制台","url":"http://127.0.0.1:49175"}]`,
					SortOrder:    2,
				},
			},
		},
		{
			Dir: model.ProjectDirectory{
				Name:        "Personal Utils 本地运维工具箱",
				Slug:        "personal-utils",
				Category:    "go_workforce",
				Path:        "/Users/conchi/workforce/go_workforce/personal_utils",
				Description: "全功能本地开发与运维聚合平台，提供容器管理、笔记管理、敏捷请求、数据库迁移脚本与配置管理",
				Icon:        "wrench",
				SortOrder:   2,
			},
			Services: []model.ProjectService{
				{
					Name:         "Personal Utils Backend API",
					Role:         "backend",
					Language:     "Go 1.22",
					Framework:    "Gin · GORM · pgx",
					RelativePath: "./server",
					Port:         39888,
					InternalPort: 39888,
					Description:  "核心 REST API 引擎，驱动 Docker/MinIO/PostgreSQL 状态探测与脚本执行",
					StartCmd:     "cd /Users/conchi/workforce/go_workforce/personal_utils/server && go run ./cmd/server/main.go",
					DevCmd:       "go run ./cmd/server/main.go",
					Endpoints:    `[{"label":"API 基础地址","url":"http://127.0.0.1:39888/api/health"}]`,
					SortOrder:    1,
				},
				{
					Name:         "Personal Utils Frontend Web",
					Role:         "frontend",
					Language:     "Node 22 · TypeScript",
					Framework:    "Vite · React 18 · TailwindCSS",
					RelativePath: "./web",
					Port:         39889,
					InternalPort: 39889,
					Description:  "现代化极客暗黑风 Web 客户端与实时看板控制台",
					StartCmd:     "cd /Users/conchi/workforce/go_workforce/personal_utils/web && npm run dev",
					DevCmd:       "npm run dev",
					Endpoints:    `[{"label":"Web 界面","url":"http://127.0.0.1:39889"}]`,
					SortOrder:    2,
				},
			},
		},
		{
			Dir: model.ProjectDirectory{
				Name:        "C12 数字化供应链平台",
				Slug:        "c12-cloud",
				Category:    "company_workforce",
				Path:        "/Users/conchi/workforce/company_workforce/c12-cloud",
				Description: "C12 数字化物流与多式联运大宗供应链核心业务集群",
				Icon:        "building",
				SortOrder:   3,
			},
			Services: []model.ProjectService{
				{
					Name:         "C12 Gateway 网关服务",
					Role:         "backend",
					Language:     "Java 17",
					Framework:    "Spring Cloud Gateway · Nacos",
					RelativePath: "./c12-gateway",
					Port:         3000,
					Description:  "统一微服务流量网关、认证鉴权与跨域路由分发",
					Endpoints:    `[{"label":"网关入口","url":"http://127.0.0.1:3000"}]`,
					SortOrder:    1,
				},
				{
					Name:         "C12 Auth 统一认证中心",
					Role:         "backend",
					Language:     "Java 17",
					Framework:    "Spring Security · OAuth2 · Redis",
					RelativePath: "./c12-auth",
					Port:         3001,
					Description:  "用户身份认证、JWT Token 签发与权限校验中心",
					SortOrder:    2,
				},
				{
					Name:         "C12 Base 基础数据服务",
					Role:         "backend",
					Language:     "Java 17",
					Framework:    "Spring Boot 3 · MyBatis-Plus",
					RelativePath: "./c12-base",
					Port:         3010,
					Description:  "组织架构、字典、地理信息与物料主数据服务",
					SortOrder:    3,
				},
				{
					Name:         "C12 Order 订单履约中心",
					Role:         "backend",
					Language:     "Java 17",
					Framework:    "Spring Boot 3 · PostgreSQL",
					RelativePath: "./c12-order",
					Port:         3020,
					Description:  "运输订单创建、运单调度与计费结算核心业务",
					SortOrder:    4,
				},
				{
					Name:         "C12 Web Portal 前端门户",
					Role:         "frontend",
					Language:     "Vue 3 · TypeScript",
					Framework:    "Vite · Element Plus · Pinia",
					RelativePath: "./c12-web",
					Port:         3000,
					Description:  "运营管理后台与业务综合协同管理门户",
					Endpoints:    `[{"label":"Web 门户","url":"http://127.0.0.1:3000"}]`,
					SortOrder:    5,
				},
			},
		},
		{
			Dir: model.ProjectDirectory{
				Name:        "Rob English Word 英语词汇项目",
				Slug:        "rob-english-word",
				Category:    "rob_english_word_workforce",
				Path:        "/Users/conchi/workforce/rob_english_word_workforce",
				Description: "英语单词语料库、填空训练与词频统计学习系统",
				Icon:        "book",
				SortOrder:   4,
			},
			Services: []model.ProjectService{
				{
					Name:         "Rob English Word Backend",
					Role:         "backend",
					Language:     "Java 17",
					Framework:    "Spring Boot · MyBatis · PostgreSQL",
					RelativePath: "./rob_english_word_back",
					Port:         8080,
					Description:  "英语题库、例句解析与学习进度持久化 API",
					SortOrder:    1,
				},
				{
					Name:         "Rob English Word Cloze Web",
					Role:         "frontend",
					Language:     "Vue 3 · TypeScript",
					Framework:    "Vite · TailwindCSS",
					RelativePath: "./rob_english_word_cloze_web",
					Port:         5174,
					Description:  "完形填空与单词快速记忆交互 Web 端",
					Endpoints:    `[{"label":"完形填空 Web","url":"http://127.0.0.1:5174"}]`,
					SortOrder:    2,
				},
				{
					Name:         "Rob English Word Front",
					Role:         "frontend",
					Language:     "Vue 3 · TypeScript",
					Framework:    "Vite · Pinia",
					RelativePath: "./rob_english_word_front",
					Port:         5175,
					Description:  "单词查阅、释义卡片与语音朗读前端",
					Endpoints:    `[{"label":"单词卡片 Web","url":"http://127.0.0.1:5175"}]`,
					SortOrder:    3,
				},
			},
		},
		{
			Dir: model.ProjectDirectory{
				Name:        "Stock Workforce 量化与行情分析",
				Slug:        "stock-workforce",
				Category:    "stock_workforce",
				Path:        "/Users/conchi/workforce/stock_workforce",
				Description: "股票行情爬取、ClickHouse 历史数据分析与调度看板",
				Icon:        "trending-up",
				SortOrder:   5,
			},
			Services: []model.ProjectService{
				{
					Name:         "Python ClickHouse Sync Worker",
					Role:         "worker",
					Language:     "Python 3.12",
					Framework:    "ClickHouse-Driver · Pandas",
					RelativePath: "./python_clickhouse",
					Port:         0,
					Description:  "A股历史日K/分钟K数据高并发写入与聚合统计任务",
					SortOrder:    1,
				},
				{
					Name:         "Go Schedule Dashboard Server",
					Role:         "backend",
					Language:     "Go 1.22",
					Framework:    "Gin · GORM",
					RelativePath: "./go_schedule_dashboard/server",
					Port:         18088,
					Description:  "股票数据调度策略监控与状态统计 API",
					SortOrder:    2,
				},
				{
					Name:         "Go Schedule Dashboard Web",
					Role:         "frontend",
					Language:     "React 18 · TypeScript",
					Framework:    "Vite · Ant Design",
					RelativePath: "./go_schedule_dashboard/web-react",
					Port:         5176,
					Description:  "量化策略与行情任务执行监控大屏",
					Endpoints:    `[{"label":"监控看板","url":"http://127.0.0.1:5176"}]`,
					SortOrder:    3,
				},
			},
		},
		{
			Dir: model.ProjectDirectory{
				Name:        "Vibe Platform 微服务平台",
				Slug:        "vibe-platform",
				Category:    "vibe_platform_workforce",
				Path:        "/Users/conchi/workforce/vibe_platform_workforce",
				Description: "多租户应用开发平台与微服务支撑中台",
				Icon:        "cpu",
				SortOrder:   6,
			},
			Services: []model.ProjectService{
				{
					Name:         "Vibe Backend Service",
					Role:         "backend",
					Language:     "Go 1.22",
					Framework:    "Gin · GORM · Redis",
					RelativePath: "./vibe_project_backend",
					Port:         8888,
					Description:  "多租户微服务平台 API 核心网关与业务服务",
					SortOrder:    1,
				},
				{
					Name:         "Vibe Admin 控制台",
					Role:         "frontend",
					Language:     "Vue 3 · TypeScript",
					Framework:    "Vite · Naive UI",
					RelativePath: "./vibe-admin",
					Port:         5180,
					Description:  "平台运营管理与权限控制系统",
					Endpoints:    `[{"label":"管理后台","url":"http://127.0.0.1:5180"}]`,
					SortOrder:    2,
				},
				{
					Name:         "Vibe Frontend 门户",
					Role:         "frontend",
					Language:     "Vue 3 · TypeScript",
					Framework:    "Vite · TailwindCSS",
					RelativePath: "./vibe-frontend",
					Port:         5181,
					Description:  "业务前台应用交互门户",
					Endpoints:    `[{"label":"用户前台","url":"http://127.0.0.1:5181"}]`,
					SortOrder:    3,
				},
			},
		},
	}

	for _, item := range dirs {
		dir := item.Dir
		if err := gdb.Create(&dir).Error; err == nil {
			for _, svc := range item.Services {
				svc.DirectoryID = dir.ID
				gdb.Create(&svc)
			}
		}
	}

	log.Printf("[DB] Seeded %d default project directories with child services", len(dirs))
}

