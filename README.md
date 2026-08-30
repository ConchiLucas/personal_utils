# ⚡ Personal Utils (个人专属开发运维全能工作台)

一套专为全栈与 DevOps 工程师打造的轻量级、高颜值、沉浸式开发运维工具平台。支持宿主机进程与配置管理、Docker 容器监控、MinIO 对象存储云端文件管理、敏捷 API 请求调试、多数据库双向迁移与个人极简习惯大盘。

---

## 🌟 核心功能模块

### 1. 🏠 个人习惯大盘 (`Home Hub`)
- 极简 4 列栅格排版，零冗余描述，聚焦常用高频操作。
- **5 大板块**：常用网站直达、高频账号密码安全速查、高频执行命令一键复制、常用本地项目路径、核心文档快速直达（调用 macOS 默认程序秒开）。
- 数据由 PostgreSQL `dashboard_items` 持久化，支持默认折叠与一键展开。

### 2. 🐳 容器与工作空间概览 (`Containers Hub`)
- 直连 Docker Daemon Socket，秒级获取容器运行状态、真实 CPU 与内存占用。
- 智能端口映射检测，自动识别 Web 端口并支持一键在新标签页中打开。
- 内置暗黑极客风格终端日志抽屉（实时日志流拉取）。

### 3. ⚙️ 宿主机服务与配置管理 (`Services & Config Manager`)
- **真实进程监听**：自动检测宿主机 `frpc`、`nginx`、`Tailscale`、`minio` 等进程是否运行，精准展示真实 PID、内存占用与 CPU。
- **配置文件在线查看与编辑**：内嵌 Prism 多语言语法高亮（TOML、CONF、YAML、INI、JSON、SH），支持在线修改直接写回本地磁盘，并支持一键重启服务。
- **系统联动**：支持调用 macOS 本地编辑器秒开，支持复制完整路径。

### 4. 📁 文件管理与 MinIO 对象存储 (`File Manager & MinIO`)
- **全格式拖拽 & 剪贴板上传**：直接拖拽文件或直接粘贴截图，秒级持久化上传至 MinIO S3 `personal-files` 存储桶。
- **全格式在线预览**：图片自适应高清查看、PDF 内嵌阅读、微软 Office 文档卡片预览。
- **Markdown & JSON 树形渲染**：Markdown 支持排版与源码双模切换；JSON 支持交互式展开/折叠树形视图与 VSCode 风格缩进参考线。
- **在线编辑写回 MinIO**：JSON、MD、TXT、代码配置文件支持在线修改并一键保存覆写 MinIO。

### 5. ⚡ 敏捷请求调试台 (`Agile Request`)
- 原生 cURL 模式的现代化 API 调试客户端。
- 自动格式化 JSON 响应、耗时分析、请求历史回放与参数模板快速填充。

### 6. 💻 脚本库与数据库迁移引擎 (`Script Hub`)
- 汇聚 MySQL、PostgreSQL、ClickHouse 跨机器双向迁移与备份脚本。
- 动态参数占位符替换注入，异步执行与实时输出日志流。

### 7. 📝 常用笔记中心 (`Notes Hub`)
- Markdown AI 笔记分类管理，支持一键复制代码块与全文快速检索。

---

## 🛠️ 技术栈

- **后端**：Go 1.22 + Gin Web Framework + GORM + MinIO Go SDK + Docker Engine API
- **前端**：React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons + PrismJS
- **存储与中间件**：PostgreSQL 16 + MinIO S3 + Redis 7.2 + Docker

---

## 🚀 快速启动

### 1. 启动后端
```bash
cd server
go run cmd/server/main.go
# 后端默认监听端口: 18999
```

### 2. 启动前端
```bash
cd web
npm install
npm run dev
# 前端默认监听端口: 5173
```

---

## 📄 许可证
MIT License
