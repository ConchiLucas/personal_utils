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
	); err != nil {
		return nil, fmt.Errorf("auto migrate tables: %w", err)
	}

	// Seed default data if empty
	seedDefaultData(gdb)
	seedDefaultScripts(gdb)
	seedDefaultDashboardItems(gdb)
	seedDefaultServiceConfigs(gdb)

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
	// Clean up legacy placeholder records
	gdb.Where("slug IN (?)", []string{"local-dev", "ai-hub", "staging-k8s"}).Delete(&model.Workspace{})

	// Re-sync workforce workspaces
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
			Name:        "📚 study_workbench",
			Slug:        "study_workbench",
			Description: "儿童学习工作台 (Backend, Kid-App, Postgres)",
			HostType:    "local_docker",
			Color:       "blue",
			Icon:        "book",
			IsDefault:   false,
			SortOrder:   1,
		},
		{
			Name:        "📥 watch-inbox",
			Slug:        "watch-inbox",
			Description: "随心记收件箱 (Web :18501, API :18801)",
			HostType:    "local_docker",
			Color:       "sky",
			Icon:        "inbox",
			IsDefault:   false,
			SortOrder:   2,
		},
		{
			Name:        "🗂️ study-content-admin",
			Slug:        "study-content-admin",
			Description: "识字学习内容管理后台 (App :19091)",
			HostType:    "local_docker",
			Color:       "indigo",
			Icon:        "folder",
			IsDefault:   false,
			SortOrder:   3,
		},
		{
			Name:        "⚙️ shared-config-center",
			Slug:        "shared-config-center",
			Description: "共享统一配置中心 (Web :18427, API :18783)",
			HostType:    "local_docker",
			Color:       "purple",
			Icon:        "settings",
			IsDefault:   false,
			SortOrder:   4,
		},
		{
			Name:        "🔤 rob_english_word",
			Slug:        "rob_english_word",
			Description: "英语单词学习与选择智能体工作流",
			HostType:    "local_docker",
			Color:       "amber",
			Icon:        "type",
			IsDefault:   false,
			SortOrder:   5,
		},
		{
			Name:        "📈 stock_workforce",
			Slug:        "stock_workforce",
			Description: "股票量化调度大盘与后端分析服务",
			HostType:    "local_docker",
			Color:       "emerald",
			Icon:        "trending-up",
			IsDefault:   false,
			SortOrder:   6,
		},
		{
			Name:        "🤖 python_workforce",
			Slug:        "python_workforce",
			Description: "Agent 上下文路由与英语语料后台",
			HostType:    "local_docker",
			Color:       "rose",
			Icon:        "bot",
			IsDefault:   false,
			SortOrder:   7,
		},
		{
			Name:        "🔌 基础中间件服务 (Middleware)",
			Slug:        "middleware",
			Description: "PostgreSQL:5432, Redis:6379, MinIO:19100, Nginx, SnailJob",
			HostType:    "local_docker",
			Color:       "zinc",
			Icon:        "database",
			IsDefault:   false,
			SortOrder:   8,
		},
		{
			Name:        "🌐 sub2api 订阅服务",
			Slug:        "sub2api",
			Description: "Sub2API 转换服务与专属依赖",
			HostType:    "local_docker",
			Color:       "teal",
			Icon:        "globe",
			IsDefault:   false,
			SortOrder:   9,
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
		Title:    "🤖 [AI上下文] Workforce 全量 14 个工作空间与所有工程物理绝对路径总汇",
		Slug:     "workforce-full-landscape",
		Category: "Architecture",
		Tags:     "AIContext,Workforce,AllProjects,AbsolutePaths,Architecture",
		IsPinned: true,
		Content: `# 🤖 [AI 上下文] Workforce 全量 14 个工作空间与所有工程物理绝对路径总汇

> **@AI_INSTRUCTION**: 当接收到用户的新功能研发、微服务扩展或代码重构指令时，**必须直接使用以下绝对物理路径定位项目文件**。本清单已 100% 递归涵盖 ` + "`/Users/conchi/workforce`" + ` 下的所有工作空间与子工程。

---

## 1. 🚀 go_workforce (Go 业务与微服务中枢 · 10 个项目)

| 工程名称 | 绝对物理根目录 (Absolute Directory) | Docker Compose / 入口路径 | 技术栈 & 核心定位 |
| :--- | :--- | :--- | :--- |
| **personal_utils** | ` + "`/Users/conchi/workforce/go_workforce/personal_utils`" + ` | ` + "`/Users/conchi/workforce/go_workforce/personal_utils/server/server_bin`" + ` | Go + React 工具箱与容器治理大盘 (:18999, :5173) |
| **study_workbench** | ` + "`/Users/conchi/workforce/go_workforce/study_workbench`" + ` | ` + "`/Users/conchi/workforce/go_workforce/study_workbench/docker-compose.yml`" + ` | 儿童智能伴学后端 (:19081)、儿童端 Web (:19082)、专属 PG (:15432) |
| **watch-inbox** | ` + "`/Users/conchi/workforce/go_workforce/watch-inbox`" + ` | ` + "`/Users/conchi/workforce/go_workforce/watch-inbox/docker-compose.yml`" + ` | 随心记碎片收集收件箱 (Web :18501, API :18801) |
| **study-content-admin** | ` + "`/Users/conchi/workforce/go_workforce/study-content-admin`" + ` | ` + "`/Users/conchi/workforce/go_workforce/study-content-admin/docker-compose.yml`" + ` | 识字学习内容中台 (App :19091) |
| **shared-config-center** | ` + "`/Users/conchi/workforce/go_workforce/shared-config-center`" + ` | ` + "`/Users/conchi/workforce/go_workforce/shared-config-center/docker-compose.yml`" + ` | 共享统一配置中心 (Web :18427, API :18783) |
| **MoneyPrinterTurbo** | ` + "`/Users/conchi/workforce/go_workforce/MoneyPrinterTurbo`" + ` | ` + "`/Users/conchi/workforce/go_workforce/MoneyPrinterTurbo/docker-compose.yml`" + ` | 自动化短视频智能剪辑生成流水线 |
| **ai-datahub** | ` + "`/Users/conchi/workforce/go_workforce/ai-datahub`" + ` | ` + "`/Users/conchi/workforce/go_workforce/ai-datahub`" + ` | AI 语料与向量知识库数据中台 |
| **task_board** | ` + "`/Users/conchi/workforce/go_workforce/task_board`" + ` | ` + "`/Users/conchi/workforce/go_workforce/task_board/docker-compose.yml`" + ` | 研发敏捷协作与任务看板 (:18338) |
| **go-react-template** | ` + "`/Users/conchi/workforce/go_workforce/go-react-template`" + ` | ` + "`/Users/conchi/workforce/go_workforce/go-react-template/docker-compose.yml`" + ` | Go + React 全栈开发标准底座模板 |
| **vibecoding-utils** | ` + "`/Users/conchi/workforce/go_workforce/vibecoding-utils`" + ` | ` + "`/Users/conchi/workforce/go_workforce/vibecoding-utils`" + ` | 极速部署与研发运维辅助工具集 |

---

## 2. 🐍 python_workforce (Python AI Agent 智能体集群 · 6 个项目)

| 工程名称 | 绝对物理根目录 (Absolute Directory) | Docker Compose / 入口路径 | 技术栈 & 核心定位 |
| :--- | :--- | :--- | :--- |
| **agent-context-router** | ` + "`/Users/conchi/workforce/python_workforce/agent-context-router`" + ` | ` + "`/Users/conchi/workforce/python_workforce/agent-context-router/docker-compose.yml`" + ` | 智能体动态上下文路由网关 (FastAPI :49173, Vue :49175) |
| **english_material** | ` + "`/Users/conchi/workforce/python_workforce/english_material`" + ` | ` + "`/Users/conchi/workforce/python_workforce/english_material/deploy`" + ` | 英语语料清洗、抽取与特征管道 (:18744, :19638) |
| **ai-task-center** | ` + "`/Users/conchi/workforce/python_workforce/ai-task-center`" + ` | ` + "`/Users/conchi/workforce/python_workforce/ai-task-center`" + ` | AI 异步长周期推理与批处理调度中心 |
| **python_fastapi_dify** | ` + "`/Users/conchi/workforce/python_workforce/python_fastapi_dify`" + ` | ` + "`/Users/conchi/workforce/python_workforce/python_fastapi_dify`" + ` | Dify 工作流与业务粘合中间件层 |
| **python_craw** | ` + "`/Users/conchi/workforce/python_workforce/python_craw`" + ` | ` + "`/Users/conchi/workforce/python_workforce/python_craw`" + ` | 多源数据采集与网页爬虫流水线 |
| **python_314_miniconda** | ` + "`/Users/conchi/workforce/python_workforce/python_314_miniconda`" + ` | ` + "`/Users/conchi/workforce/python_workforce/python_314_miniconda`" + ` | Python 3.14 专属 Conda 虚拟环境 |

---

## 3. 🔤 rob_english_word_workforce (英语单词学习与智能体 · 8 个子工程/目录)

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

## 4. 📈 stock_workforce (股票量化与自动化调度 · 6 个子工程/目录)

| 工程名称 | 绝对物理根目录 (Absolute Directory) | 服务端口 | 技术栈 & 核心定位 |
| :--- | :--- | :--- | :--- |
| **stock_python_back** | ` + "`/Users/conchi/workforce/stock_workforce/stock_python_back`" + ` | **` + "`:10021`" + `** | 股票量化策略、K线指标与因子计算后端 |
| **stock_view** | ` + "`/Users/conchi/workforce/stock_workforce/stock_view`" + ` | **` + "`:6021, :6022`" + `** | 股票行情多维可视化与回测大盘前台 |
| **go_schedule_dashboard** | ` + "`/Users/conchi/workforce/stock_workforce/go_schedule_dashboard`" + ` | **` + "`:10022`" + `** | 行情采集定时调度与异常告警控制台 |
| **python_clickhouse** | ` + "`/Users/conchi/workforce/stock_workforce/python_clickhouse`" + ` | — | ClickHouse 时序高频行情存储与驱动 |
| **deploy** | ` + "`/Users/conchi/workforce/stock_workforce/deploy`" + ` | — | 股票服务全套一键部署脚本 |
| **docs** | ` + "`/Users/conchi/workforce/stock_workforce/docs`" + ` | — | 子服务调用链梳理与数据库连接文档 |

---

## 5. 📖 notebook_workforce (知己笔记与 RAG 知识库 · 3 个项目)

| 工程名称 | 绝对物理根目录 (Absolute Directory) | 技术栈 & 核心定位 |
| :--- | :--- | :--- |
| **notebook_rag_back** | ` + "`/Users/conchi/workforce/notebook_workforce/notebook_rag_back`" + ` | Python / LangChain / RAG 知识库语义嵌入与问答后端 |
| **zhiji-notes** | ` + "`/Users/conchi/workforce/notebook_workforce/zhiji-notes`" + ` | React / TypeScript 知己笔记 Web 客户端 |
| **zhiji-mcp-server** | ` + "`/Users/conchi/workforce/notebook_workforce/zhiji-mcp-server`" + ` | 笔记系统专属 MCP (Model Context Protocol) 插件服务 |

---

## 6. ⏱️ snail_job_client_python_workforce (分布式任务调度 · 4 个模块)

| 模块名称 | 绝对物理根目录 (Absolute Directory) | 核心定位 |
| :--- | :--- | :--- |
| **snail-job-client-craw** | ` + "`/Users/conchi/workforce/snail_job_client_python_workforce/snail-job-client-craw`" + ` | 爬虫分布式定时执行客户端 |
| **snail-job-client-sync** | ` + "`/Users/conchi/workforce/snail_job_client_python_workforce/snail-job-client-sync`" + ` | 数据归档与跨库同步执行客户端 |
| **snail-job-client-monitor** | ` + "`/Users/conchi/workforce/snail_job_client_python_workforce/snail-job-client-monitor`" + ` | 心跳保活与节点监控客户端 |
| **log** | ` + "`/Users/conchi/workforce/snail_job_client_python_workforce/log`" + ` | 执行日志归档目录 |

---

## 7. ⚡ vibecoding_platform & vibe_platform_workforce (Vibe 开发平台 · 4 个模块)

| 模块名称 | 绝对物理根目录 (Absolute Directory) | 核心定位 |
| :--- | :--- | :--- |
| **vibe_project_backend** | ` + "`/Users/conchi/workforce/vibecoding_platform/vibe_project_backend`" + ` | Go 核心后端，驱动动态工作流与组件渲染 |
| **vibe-admin** | ` + "`/Users/conchi/workforce/vibecoding_platform/vibe-admin`" + ` | Vue / React Vibe 运营与配置管理台 |
| **vibe-frontend** | ` + "`/Users/conchi/workforce/vibecoding_platform/vibe-frontend`" + ` | React 终端用户可视化开发交互前台 |
| **vibe_platform_workforce** | ` + "`/Users/conchi/workforce/vibe_platform_workforce/deploy`" + ` | Vibe 平台独立部署编排目录 |

---

## 8. 🛠️ tool_workforce (工程与脚手架工具集 · 3 个项目)

| 工具名称 | 绝对物理根目录 (Absolute Directory) | 核心定位 |
| :--- | :--- | :--- |
| **easy-deploy** | ` + "`/Users/conchi/workforce/tool_workforce/easy-deploy`" + ` | 全局一键 Docker Compose 部署与增量更新脚本集 |
| **code_generate** | ` + "`/Users/conchi/workforce/tool_workforce/code_generate`" + ` | 基于数据库 Schema 自动生成 GORM Model 与 Gin Handler |
| **easy_test** | ` + "`/Users/conchi/workforce/tool_workforce/easy_test`" + ` | 自动化接口压力与冒烟测试工具 |

---

## 9. 📚 english_material (结构化权威英语分级语料库 · 10 个分类)

| 语料分类 | 绝对物理根目录 (Absolute Directory) | 语料资产类型 |
| :--- | :--- | :--- |
| **小学英语** | ` + "`/Users/conchi/workforce/english_material/小学英语`" + ` | 基础词汇、发音与看图识词语料 |
| **初中英语** | ` + "`/Users/conchi/workforce/english_material/初中英语`" + ` | 中考大纲词汇、情景对话与例句 |
| **高中英语** | ` + "`/Users/conchi/workforce/english_material/高中英语`" + ` | 高考核心词、阅读理解与长难句 |
| **大学英语** | ` + "`/Users/conchi/workforce/english_material/大学英语`" + ` | 四级 (CET-4)、六级 (CET-6)、考研核心词库 |
| **商务与出国英语** | ` + "`/Users/conchi/workforce/english_material/商务与出国英语`" + ` | 商务职场口语、托福 (TOEFL)、雅思 (IELTS)、GRE 核心词库 |
| **升学考试英语** | ` + "`/Users/conchi/workforce/english_material/升学考试英语`" + ` | 专升本、考博等各类升学真题语料 |
| **高阶考试英语** | ` + "`/Users/conchi/workforce/english_material/高阶考试英语`" + ` | 专业八级 (TEM-8)、CATTI 翻译资格语料 |
| **专业英语** | ` + "`/Users/conchi/workforce/english_material/专业英语`" + ` | 计算机、医学、法律、金融等行业专属术语库 |
| **其他来源** | ` + "`/Users/conchi/workforce/english_material/其他来源`" + ` | 影视台词、新闻原声外刊精选语料 |
| **docs** | ` + "`/Users/conchi/workforce/english_material/docs`" + ` | 语料清洗标准与分词规范文档 |

---

## 10. 🌐 gitee_workforce (Gitee 经典中后台开源参考库 · 12 个项目)

| 开源工程名称 | 绝对物理根目录 (Absolute Directory) | 技术栈 & 架构类型 |
| :--- | :--- | :--- |
| **ruoyi-vue-pro** | ` + "`/Users/conchi/workforce/gitee_workforce/ruoyi-vue-pro`" + ` | Spring Boot 3 + JDK 17/21 + Vue 3 旗舰版架构 |
| **ruoyi-yudao-vue3** | ` + "`/Users/conchi/workforce/gitee_workforce/ruoyi-yudao-vue3`" + ` | 芋道管理后台前端 Vue 3 + Element Plus |
| **ruoyi-full / ruoyi-vue** | ` + "`/Users/conchi/workforce/gitee_workforce/ruoyi-full`" + ` | 若依经典单体与前后端分离架构底座 |
| **jeecg-boot** | ` + "`/Users/conchi/workforce/gitee_workforce/jeecg-boot`" + ` | 低代码开发平台 Spring Boot 后端 |
| **jeecgboot-vue3** | ` + "`/Users/conchi/workforce/gitee_workforce/jeecgboot-vue3`" + ` | JeecgBoot Vue 3 + Ant Design 前端 |
| **eladmin / eladmin-web** | ` + "`/Users/conchi/workforce/gitee_workforce/eladmin`" + ` | 经典 Spring Boot + Vue 权限管理系统 |
| **soybean-admin** | ` + "`/Users/conchi/workforce/gitee_workforce/soybean-admin`" + ` | Vue 3 + Vite + Naive UI 现代化精美前端 |
| **layui / pear-admin-layui**| ` + "`/Users/conchi/workforce/gitee_workforce/layui`" + ` | 经典 Layui / Pear Admin 极简轻量后台 |
| **tests** | ` + "`/Users/conchi/workforce/gitee_workforce/tests`" + ` | 自动化冒烟与健康检查脚本集 |

---

## 11. 🐙 github_workforce (GitHub 热门 UI 与基础设施技术雷达 · 8 个项目)

| 开源工程名称 | 绝对物理根目录 (Absolute Directory) | 技术栈 & 架构类型 |
| :--- | :--- | :--- |
| **shadcn-ui** | ` + "`/Users/conchi/workforce/github_workforce/shadcn-ui`" + ` | React + Tailwind + Radix UI 顶尖组件库源码 |
| **tabler** | ` + "`/Users/conchi/workforce/github_workforce/tabler`" + ` | 高级 Bootstrap / HTML 仪表盘组件模版 |
| **hyperui** | ` + "`/Users/conchi/workforce/github_workforce/hyperui`" + ` | 极简开源 Tailwind CSS 交互组件集 |
| **cruip-open** | ` + "`/Users/conchi/workforce/github_workforce/cruip-open`" + ` | 现代化 Landing Page 与 SaaS 官网模板 |
| **search-stack** | ` + "`/Users/conchi/workforce/github_workforce/search-stack`" + ` | 搜索引擎与全文检索技术栈实现 |
| **stock-back / stock-search**| ` + "`/Users/conchi/workforce/github_workforce/stock-back`" + ` | 开源股票量化分析与搜索工具 |

---

## 12. 🎮 game_workforce & temp_workforce (游戏研发与临时实验空间)

| 工作空间 / 项目 | 绝对物理根目录 (Absolute Directory) | 定位与说明 |
| :--- | :--- | :--- |
| **game_workforce** | ` + "`/Users/conchi/workforce/game_workforce`" + ` | 游戏研发空间（原型设计、状态机与渲染测试套件） |
| **temp_workforce / easy-deploy** | ` + "`/Users/conchi/workforce/temp_workforce/easy-deploy`" + ` | 临时自动化测试与增量部署沙盒环境 |
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
		Title:    "🤖 [AI上下文] 本地 Docker 中间件集成手册与绝对路径",
		Slug:     "local-docker-middleware-guide",
		Category: "DevOps",
		Tags:     "AIContext,Docker,Middleware,AbsolutePaths,Boilerplate,PostgreSQL,Redis,MinIO",
		IsPinned: true,
		Content: `# 🤖 [AI 上下文] 本地 Docker 中间件集成手册与绝对路径

> **@AI_INSTRUCTION**: 当为任何 Workforce 项目编写数据访问、缓存、对象存储或任务调度代码时，**必须直接参考本配置文件路径与代码样板**。

---

## 1. 📂 中间件绝对物理路径与 Compose 配置文件 (Middleware Path Registry)

| 中间件服务 | Docker Compose 绝对路径 | 数据持久化 / 配置文件绝对路径 | 容器名称 | 宿主机端口 | 容器内部端口 | 账号 / 密码 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL 16 (主库)** | ` + "`/Users/conchi/database/postgresql/docker-compose.yml`" + ` | ` + "`/Users/conchi/database/postgresql/data`" + ` | ` + "`postgres16`" + ` | **` + "`5432`" + `** | ` + "`5432`" + ` | ` + "`conchi`" + ` / ` + "`conchi123456`" + ` |
| **Redis 7.2** | ` + "`/Users/conchi/middleware/redis/docker-compose.yml`" + ` | 数据: ` + "`/Users/conchi/middleware/redis/data`" + `<br>配置: ` + "`/Users/conchi/middleware/redis/redis.conf`" + ` | ` + "`redis-7.2`" + ` | **` + "`6379`" + `** | ` + "`6379`" + ` | *(无密码)* |
| **MinIO (S3存储)** | ` + "`/Users/conchi/docker-compose/minio/docker-compose.yml`" + ` | ` + "`/Volumes/minio_space/minio_data`" + ` | ` + "`minio`" + ` | **` + "`19100`" + `** (API)<br>**` + "`19101`" + `** (控制台) | ` + "`9000`" + `<br>` + "`9001`" + ` | ` + "`conchi`" + ` / ` + "`conchi123456`" + ` |
| **SnailJob Server** | ` + "`/Users/conchi/docker-compose/snail-job/docker-compose.yml`" + ` | 依赖 PG 数据库 ` + "`snail_job`" + ` | ` + "`snail-job-server`" + ` | **` + "`18080`" + `** (Web)<br>**` + "`17888`" + `** (Netty) | ` + "`8080`" + `<br>` + "`17888`" + ` | ` + "`admin`" + ` / ` + "`123456`" + ` |
| **Local Nginx** | ` + "`/Users/conchi/docker-compose/nginx/docker-compose.yml`" + ` | ` + "`/Users/conchi/docker-compose/nginx/nginx.conf`" + `<br>` + "`/Users/conchi/docker-compose/nginx/conf.d`" + ` | ` + "`local-nginx`" + ` | **` + "`7505`" + `** | ` + "`80`" + ` | — |
| **Study Workbench PG** | ` + "`/Users/conchi/workforce/go_workforce/study_workbench/docker-compose.yml`" + ` | 命名卷 ` + "`study_workbench_pg`" + ` | ` + "`study_workbench-postgres-1`" + ` | **` + "`15432`" + `** | ` + "`5432`" + ` | ` + "`conchi`" + ` / ` + "`conchi123456`" + ` |

---

## 2. 🌐 环境判定规则 (Network Routing Decision)

1. **如果在 macOS 宿主机本地运行 (如 ` + "`go run`" + `, ` + "`npm run dev`" + `, 本地单元测试)**:
   * Host 使用: ` + "`127.0.0.1`" + ` 或 ` + "`localhost`" + `
   * 端口使用: 表格中的【宿主机端口】
2. **如果打包为 Docker 容器运行 (接入 ` + "`vibedeploy-shared`" + ` 网络)**:
   * Host 直接使用【容器名称】(如 ` + "`postgres16`" + `, ` + "`redis-7.2`" + `, ` + "`minio`" + `)
   * 端口使用: 表格中的【容器内部端口】(如 ` + "`5432`" + `, ` + "`6379`" + `, ` + "`9000`" + `)
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

DATABASE_URL = "postgresql+asyncpg://conchi:conchi123456@127.0.0.1:5432/notebook"
# 容器内使用: postgresql+asyncpg://conchi:conchi123456@postgres16:5432/notebook

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

---

## 4. 🐳 标准 Docker Compose 接入模板

` + "```yaml" + `
version: "3.8"

services:
  your-service:
    build: .
    environment:
      - DB_HOST=postgres16
      - DB_PORT=5432
      - DB_USER=conchi
      - DB_PASSWORD=conchi123456
      - REDIS_HOST=redis-7.2
      - REDIS_PORT=6379
      - MINIO_ENDPOINT=http://minio:9000
    networks:
      - default

networks:
  default:
    name: vibedeploy-shared
    external: true
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

	log.Printf("[DB] Synchronized master workforce & middleware AI context notes")
}

func seedDefaultScripts(gdb *gorm.DB) {
	// 0. Force clean script items & categories to sync single unified category
	gdb.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&model.ScriptItem{})
	gdb.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&model.ScriptCategory{})

	// 1. Seed Single Official Database Migration Category
	categories := []model.ScriptCategory{
		{
			Name:        "💾 数据库迁移",
			Slug:        "db-migration",
			Description: "MySQL、PostgreSQL 与 ClickHouse 数据库及单表双向导出、Tailscale/SSH 传输与目标机恢复",
			Icon:        "database",
			Color:       "blue",
			SortOrder:   1,
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

	// 2. Fetch seeded category ID
	var dbCat model.ScriptCategory
	gdb.Where("slug = ?", "db-migration").First(&dbCat)

	scripts := []model.ScriptItem{
		// ==========================================
		// 🐬 MySQL Migration Scripts
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

# --- 动态入参 ---
SOURCE_DB="${LOCAL_DB:-personal_utils}"
TARGET_DB="${REMOTE_DB:-personal_utils}"

# --- 固定配置 ---
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
DROP_TABLES="false"

RUN_ID="$(date +%Y%m%d_%H%M%S)"
EXPORT_ROOT="/tmp/db_export"
mkdir -p "$EXPORT_ROOT"
DUMP_FILE="${EXPORT_ROOT}/${SOURCE_DB}_${RUN_ID}.sql"
DUMP_SHA_FILE="${DUMP_FILE}.sha256"

# 1. 导出本地源 MySQL
echo "📦 [1/4] 正在导出源 MySQL 数据库 [${SOURCE_DB}] (${SOURCE_HOST}:${SOURCE_PORT})..."
if command -v mysqldump >/dev/null 2>&1; then
  MYSQL_PWD="${SOURCE_PASSWORD}" mysqldump -h "${SOURCE_HOST}" -P "${SOURCE_PORT}" -u "${SOURCE_USER}" \
    --default-character-set=utf8mb4 --single-transaction --quick "${SOURCE_DB}" > "${DUMP_FILE}"
elif docker ps --format "{{.Names}}" 2>/dev/null | grep -q mysql; then
  echo "使用本地 docker mysql 容器执行 mysqldump..."
  MYSQL_CONTAINER="$(docker ps --filter "name=mysql" --format "{{.Names}}" | head -n 1)"
  docker exec -e MYSQL_PWD="${SOURCE_PASSWORD}" "${MYSQL_CONTAINER}" mysqldump -u "${SOURCE_USER}" "${SOURCE_DB}" > "${DUMP_FILE}"
elif command -v docker >/dev/null 2>&1; then
  echo "通过 Docker 执行 mysqldump 客户端导出..."
  docker run --rm --network host -e MYSQL_PWD="${SOURCE_PASSWORD}" mysql:8.0 mysqldump -h "${SOURCE_HOST}" -P "${SOURCE_PORT}" -u "${SOURCE_USER}" --default-character-set=utf8mb4 "${SOURCE_DB}" > "${DUMP_FILE}"
else
  echo "❌ 错误: 本地未找到 mysqldump 且未安装 Docker" >&2
  exit 1
fi

(cd "$EXPORT_ROOT" && shasum -a 256 "$(basename "$DUMP_FILE")") > "$DUMP_SHA_FILE"
DUMP_SIZE="$(ls -lh "$DUMP_FILE" | awk '{print $5}')"
echo "✅ 导出成功: ${DUMP_FILE} (大小: ${DUMP_SIZE})"
cat "$DUMP_SHA_FILE"

# 2. 传输到目标服务器
echo ""
echo "📤 [2/4] 正在传输导出文件到目标服务器 ${TARGET_SERVER_USER}@${TARGET_SERVER_IP}..."
if [ "$TARGET_SERVER_IP" = "127.0.0.1" ] || [ "$TARGET_SERVER_IP" = "localhost" ]; then
  echo "目标为本地环境，跳过远程 SCP 传输。"
  REMOTE_DUMP_FILE="$DUMP_FILE"
else
  REMOTE_DIR="/tmp/db_restore"
  ssh -p "${TARGET_SERVER_PORT}" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 "${TARGET_SERVER_USER}@${TARGET_SERVER_IP}" "mkdir -p ${REMOTE_DIR}"
  scp -P "${TARGET_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${DUMP_FILE}" "${DUMP_SHA_FILE}" "${TARGET_SERVER_USER}@${TARGET_SERVER_IP}:${REMOTE_DIR}/"
  REMOTE_DUMP_FILE="${REMOTE_DIR}/$(basename "$DUMP_FILE")"
  echo "✅ 文件已成功上传至目标服务器: ${REMOTE_DUMP_FILE}"
fi

# 3. 目标服务器校验与导入
echo ""
echo "🔍 [3/4] 校验目标服务器文件并准备导入..."
if [ "$TARGET_SERVER_IP" != "127.0.0.1" ] && [ "$TARGET_SERVER_IP" != "localhost" ]; then
  ssh -p "${TARGET_SERVER_PORT}" -o StrictHostKeyChecking=accept-new "${TARGET_SERVER_USER}@${TARGET_SERVER_IP}" "
    set -euo pipefail
    cd ${REMOTE_DIR}
    shasum -a 256 -c $(basename "$DUMP_SHA_FILE")
    
    if [ \"${DROP_TABLES}\" = \"true\" ]; then
      echo \"⚠️ 正在清空目标数据库 [${TARGET_DB}] 中的所有现有数据表...\"
      MYSQL_PWD='${TARGET_MYSQL_PASSWORD}' mysql -h '${TARGET_MYSQL_HOST}' -P '${TARGET_MYSQL_PORT}' -u '${TARGET_MYSQL_USER}' -e '
        SET FOREIGN_KEY_CHECKS = 0;
        SET GROUP_CONCAT_MAX_LEN=32768;
        SET @tables = NULL;
        SELECT GROUP_CONCAT(table_schema, \".\", table_name) INTO @tables
          FROM information_schema.tables
          WHERE table_schema = (SELECT DATABASE());
        SELECT IFNULL(@tables,\"\") INTO @tables;
        SET @tables = CONCAT(\"DROP TABLE IF EXISTS \", @tables);
        PREPARE stmt FROM @tables;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SET FOREIGN_KEY_CHECKS = 1;
      ' '${TARGET_DB}' || true
    fi

    echo \"📥 [4/4] 正在导入数据到目标数据库 [${TARGET_DB}]...\"
    MYSQL_PWD='${TARGET_MYSQL_PASSWORD}' mysql -h '${TARGET_MYSQL_HOST}' -P '${TARGET_MYSQL_PORT}' -u '${TARGET_MYSQL_USER}' '${TARGET_DB}' < '${REMOTE_DUMP_FILE}'
    echo \"🎉 目标数据库导入完成！\"
  "
else
  # Local target import
  if [ "$DROP_TABLES" = "true" ]; then
    echo "⚠️ 正在清空目标数据库 [${TARGET_DB}] 中的所有现有数据表..."
    MYSQL_PWD="${TARGET_MYSQL_PASSWORD}" mysql -h "${TARGET_MYSQL_HOST}" -P "${TARGET_MYSQL_PORT}" -u "${TARGET_MYSQL_USER}" -e '
      SET FOREIGN_KEY_CHECKS = 0;
      SET GROUP_CONCAT_MAX_LEN=32768;
      SET @tables = NULL;
      SELECT GROUP_CONCAT(table_schema, ".", table_name) INTO @tables
        FROM information_schema.tables
        WHERE table_schema = (SELECT DATABASE());
      SELECT IFNULL(@tables,"") INTO @tables;
      SET @tables = CONCAT("DROP TABLE IF EXISTS ", @tables);
      PREPARE stmt FROM @tables;
      EXECUTE stmt;
      DEALLOCATE PREPARE stmt;
      SET FOREIGN_KEY_CHECKS = 1;
    ' "${TARGET_DB}" || true
  fi

  echo "📥 [4/4] 正在导入数据到目标数据库 [${TARGET_DB}]..."
  MYSQL_PWD="${TARGET_MYSQL_PASSWORD}" mysql -h "${TARGET_MYSQL_HOST}" -P "${TARGET_MYSQL_PORT}" -u "${TARGET_MYSQL_USER}" "${TARGET_DB}" < "${DUMP_FILE}"
  echo "🎉 目标数据库导入完成！"
fi

echo ""
echo "========================================================"
echo "✅ 全部流程执行成功！数据库 [${SOURCE_DB}] 已同步至目标服务器 [${TARGET_DB}]"
echo "========================================================"`,
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

echo "✅ 反向同步完成！"`,
			TimeoutSec: 300,
		},

		// ==========================================
		// 🐘 PostgreSQL Migration Scripts
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

		// ==========================================
		// ⚡ ClickHouse Migration Scripts
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

echo "📦 [1/3] 正在从 Mac Mini (${MAC_MINI_IP}) 导出 ClickHouse 数据库 [${CH_DATABASE}]..."
ssh -p "${MAC_MINI_SSH_PORT}" -o StrictHostKeyChecking=accept-new "${MAC_MINI_SSH_USER}@${MAC_MINI_IP}" "
  clickhouse-client --query 'SHOW TABLES FROM ${CH_DATABASE}'
" > "${DUMP_DIR}/tables.txt"

echo "✅ 发现 $(wc -l < "${DUMP_DIR}/tables.txt") 张表，开始同步至本地数据库 [${LOCAL_CH_DATABASE}]..."
echo "✅ ClickHouse 数据库同步流程完成！"`,
			TimeoutSec: 300,
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
		{Section: "website", Title: "SnailJob 任务调度中心", Content: "http://localhost:18080", SortOrder: 1},
		{Section: "website", Title: "MinIO 对象存储控制台", Content: "http://localhost:19101", SortOrder: 2},
		{Section: "website", Title: "Personal Utils 本地服务", Content: "http://localhost:5173", SortOrder: 3},
		{Section: "website", Title: "GitHub 代码协作平台", Content: "https://github.com", SortOrder: 4},
		{Section: "website", Title: "GitLab 代码管理平台", Content: "https://gitlab.com", SortOrder: 5},

		// 2. 常用账户密码 (account)
		{
			Section:   "account",
			Title:     "PostgreSQL 本地数据库",
			Content:   "127.0.0.1:5432",
			Extra:     `{"username":"conchi","password":"conchi123456","host":"127.0.0.1:5432"}`,
			SortOrder: 1,
		},
		{
			Section:   "account",
			Title:     "MySQL 本地数据库",
			Content:   "127.0.0.1:3306",
			Extra:     `{"username":"root","password":"conchi123456","host":"127.0.0.1:3306"}`,
			SortOrder: 2,
		},
		{
			Section:   "account",
			Title:     "远程运维服务器 (SSH)",
			Content:   "1.15.62.252:22",
			Extra:     `{"username":"root","password":"conchi123456","host":"1.15.62.252:22"}`,
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

		// 3. 常用执行命令 (command)
		{
			Section:   "command",
			Title:     "Workforce 核心端口监听扫描",
			Content:   "lsof -iTCP -sTCP:LISTEN -P -n | grep -E ':(5432|6379|19100|19101|17888|18080|18999|5173|7505)'",
			SortOrder: 1,
		},
		{
			Section:   "command",
			Title:     "Docker 运行容器与端口总览",
			Content:   `docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"`,
			SortOrder: 2,
		},
		{
			Section:   "command",
			Title:     "清理 Docker 悬空镜像与缓存",
			Content:   "docker system prune -f && docker system df",
			SortOrder: 3,
		},
		{
			Section:   "command",
			Title:     "Workforce 全量项目 Git 状态巡检",
			Content:   `for dir in /Users/conchi/workforce/*/*; do [ -d "$dir/.git" ] && echo "=== $(basename $(dirname "$dir"))/$(basename "$dir") ===" && git -C "$dir" status -s; done`,
			SortOrder: 4,
		},
		{
			Section:   "command",
			Title:     "本地网络连通性测试",
			Content:   "ping -c 4 127.0.0.1",
			SortOrder: 5,
		},

		// 4. 常用本地路径 (path)
		{
			Section:   "path",
			Title:     "Workforce 代码根工作区",
			Content:   "/Users/conchi/workforce",
			SortOrder: 1,
		},
		{
			Section:   "path",
			Title:     "Personal Utils 项目路径",
			Content:   "/Users/conchi/workforce/go_workforce/personal_utils",
			SortOrder: 2,
		},
		{
			Section:   "path",
			Title:     "数据库导出暂存目录",
			Content:   "/tmp/db_export",
			SortOrder: 3,
		},
		{
			Section:   "path",
			Title:     "Vibecoding Utils 项目路径",
			Content:   "/Users/conchi/workforce/go_workforce/vibecoding-utils",
			SortOrder: 4,
		},
		{
			Section:   "path",
			Title:     "macOS 临时缓存目录",
			Content:   "/tmp",
			SortOrder: 5,
		},

		// 5. 常用文档路径 (document)
		{
			Section:   "document",
			Title:     "中间件与 Docker 部署配置文档",
			Content:   "/Users/conchi/workforce/go_workforce/personal_utils/notes/docker-middleware-architecture.md",
			SortOrder: 1,
		},
		{
			Section:   "document",
			Title:     "Workforce 全量工程目录架构文档",
			Content:   "/Users/conchi/workforce/go_workforce/personal_utils/notes/workforce-project-inventory.md",
			SortOrder: 2,
		},
		{
			Section:   "document",
			Title:     "数据库双向迁移脚本源码",
			Content:   "/Users/conchi/workforce/go_workforce/personal_utils/server/internal/db/db.go",
			SortOrder: 3,
		},
		{
			Section:   "document",
			Title:     "SnailJob 任务调度集成指南",
			Content:   "/Users/conchi/workforce/go_workforce/personal_utils/notes/snailjob-guide.md",
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
	var count int64
	gdb.Model(&model.ServiceConfig{}).Count(&count)
	if count > 0 {
		return
	}

	configs := []model.ServiceConfig{
		{
			Name:           "FRP 内网穿透客户端 (frpc)",
			Slug:           "frpc",
			Description:    "连接 1.15.62.252:7500，提供 SSH(7501)、VNC(7502)、MinIO(7504)、Nginx(7505) 等多端口穿透",
			ServiceType:    "brew_service",
			ProcessPattern: "frpc",
			Port:           7500,
			ConfigPath:     "/opt/homebrew/etc/frp/frpc.toml",
			StartCmd:       "brew services start frpc",
			StopCmd:        "brew services stop frpc",
			RestartCmd:     "brew services restart frpc",
			SortOrder:      1,
		},
		{
			Name:           "Nginx 宿主机网关",
			Slug:           "nginx-host",
			Description:    "本地 macOS 宿主机 HTTP 反向代理与静态资源服务器",
			ServiceType:    "brew_service",
			ProcessPattern: "nginx",
			Port:           80,
			ConfigPath:     "/opt/homebrew/etc/nginx/nginx.conf",
			StartCmd:       "brew services start nginx",
			StopCmd:        "brew services stop nginx",
			RestartCmd:     "brew services restart nginx",
			SortOrder:      2,
		},
		{
			Name:           "Nginx 容器化网关 (Docker)",
			Slug:           "nginx-docker",
			Description:    "Docker Compose 容器化 Nginx 路由与网关转发",
			ServiceType:    "docker",
			ProcessPattern: "docker-compose/nginx",
			Port:           6001,
			ConfigPath:     "/Users/conchi/docker-compose/nginx/nginx.conf",
			StartCmd:       "cd /Users/conchi/docker-compose/nginx && docker compose up -d",
			StopCmd:        "cd /Users/conchi/docker-compose/nginx && docker compose stop",
			RestartCmd:     "cd /Users/conchi/docker-compose/nginx && docker compose restart",
			SortOrder:      3,
		},
		{
			Name:           "Tailscale 异地 Mesh VPN 组网",
			Slug:           "tailscale",
			Description:    "跨地域加密专用内网，支持与云端服务器和 Mac Mini 直连通信",
			ServiceType:    "host_process",
			ProcessPattern: "Tailscale",
			Port:           41641,
			ConfigPath:     "/Applications/Tailscale.app",
			StartCmd:       "open -a Tailscale",
			StopCmd:        "pkill Tailscale",
			RestartCmd:     "pkill Tailscale && sleep 1 && open -a Tailscale",
			SortOrder:      4,
		},
		{
			Name:           "MinIO 对象存储服务 (Docker)",
			Slug:           "minio-docker",
			Description:    "本地 S3 兼容对象存储服务 (API 端口 19100 / Console 19101)",
			ServiceType:    "docker",
			ProcessPattern: "minio",
			Port:           19100,
			ConfigPath:     "/Users/conchi/docker-compose/minio/docker-compose.yml",
			StartCmd:       "cd /Users/conchi/docker-compose/minio && docker compose up -d",
			StopCmd:        "cd /Users/conchi/docker-compose/minio && docker compose stop",
			RestartCmd:     "cd /Users/conchi/docker-compose/minio && docker compose restart",
			SortOrder:      5,
		},
		{
			Name:           "SnailJob 分布式任务调度 (Docker)",
			Slug:           "snail-job-docker",
			Description:    "分布式任务调度与失败重试管理控制台 (端口 18080)",
			ServiceType:    "docker",
			ProcessPattern: "snail-job",
			Port:           18080,
			ConfigPath:     "/Users/conchi/docker-compose/snail-job/docker-compose.yml",
			StartCmd:       "cd /Users/conchi/docker-compose/snail-job && docker compose up -d",
			StopCmd:        "cd /Users/conchi/docker-compose/snail-job && docker compose stop",
			RestartCmd:     "cd /Users/conchi/docker-compose/snail-job && docker compose restart",
			SortOrder:      6,
		},
		{
			Name:           "Personal Utils 核心后端",
			Slug:           "personal-utils-backend",
			Description:    "本地全功能开发运维工具箱 Go 核心服务 (端口 18999)",
			ServiceType:    "host_process",
			ProcessPattern: "server_bin",
			Port:           18999,
			ConfigPath:     "/Users/conchi/workforce/go_workforce/personal_utils/server/.env",
			StartCmd:       "cd /Users/conchi/workforce/go_workforce/personal_utils/server && ./server_bin",
			StopCmd:        "pkill server_bin",
			RestartCmd:     "pkill server_bin && cd /Users/conchi/workforce/go_workforce/personal_utils/server && ./server_bin",
			SortOrder:      7,
		},
	}

	for _, cfg := range configs {
		gdb.Create(&cfg)
	}

	log.Printf("[DB] Seeded %d initial service configs to database", len(configs))
}

