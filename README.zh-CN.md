# DataWeaver

**DataWeaver** 是一个企业级数据管理和 AI 集成平台，通过 Model Context Protocol (MCP) 将传统数据库与现代 AI 系统连接起来。

[English](README.md)

## 功能特性

- **多数据库支持**：连接 MySQL、PostgreSQL、SQL Server 和 Oracle 数据库
- **查询构建器**：创建和管理带参数验证的 SQL 查询
- **工具生成**：将查询转换为可被 AI 调用的可复用工具
- **MCP 服务器**：通过 Model Context Protocol 暴露工具，供 AI 助手集成
- **实时监控**：跟踪查询执行、API 调用和系统统计信息
- **多 AI 提供商支持**：兼容 OpenAI、Anthropic、Google 以及多种国内 AI 服务商
- **安全设计**：加密凭证存储、JWT 认证和 API 密钥保护

## 架构设计

```
┌─────────────────┐                              ┌─────────────────┐
│    AI 助手      │                              │   React 前端    │
│ (Claude, GPT)   │                              │    (仪表板)     │
└────────┬────────┘                              └────────┬────────┘
         │                                                │
         ▼                                                │
┌─────────────────┐                                       │
│   MCP 服务器    │                                       │
│   (HTTP/SSE)    │                                       │
└────────┬────────┘                                       │
         │                                                │
         └──────────────────┬─────────────────────────────┘
                            ▼
         ┌─────────────────────────────────┐
         │      DataWeaver 后端 API        │
         └──────┬──────────────────┬───────┘
                │                  │
                ▼                  ▼
     ┌─────────────────┐    ┌─────────────────┐
     │   PostgreSQL    │    │   外部数据库    │
     │    (元数据)     │    │ MySQL/PG/MSSQL  │
     └─────────────────┘    └─────────────────┘
```

## 技术栈

### 后端
- **Go 1.24** + Gin Web 框架
- **GORM** ORM 框架和数据库迁移
- **JWT** 身份认证
- **Zap** 结构化日志
- **Swagger** API 文档

### 前端
- **React 19** + TypeScript
- **Vite** 构建工具
- **TailwindCSS** + shadcn/ui 组件库
- **Zustand** 状态管理
- **TanStack Query** 服务端状态管理

## 快速开始

### 环境要求
- Go 1.24+
- Node.js 18+
- PostgreSQL 15+

### 后端配置

```bash
# 克隆仓库
git clone https://github.com/yourusername/dataweaver.git
cd dataweaver

# 安装依赖
make deps

# 配置应用
cp config/config.yaml.example config/config.yaml
# 编辑 config/config.yaml 配置数据库连接

# 运行服务
make run
```

### 前端配置

```bash
cd dataweaver-frontend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env: VITE_API_BASE_URL=http://localhost:8080/api

# 启动开发服务器
npm run dev
```

### 使用 Docker Compose

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down
```

## 配置说明

### 后端配置 (`config/config.yaml`)

```yaml
server:
  port: 8080
  mode: debug  # debug, release, test

database:
  host: localhost
  port: 5432
  user: postgres
  password: postgres
  dbname: dataweaver

jwt:
  secret: your-secret-key-change-in-production  # 生产环境请修改
  expire_hours: 24

encryption:
  key: 12345678901234567890123456789012  # 必须为32字节
```

### 前端配置 (`.env`)

```
VITE_API_BASE_URL=http://localhost:8080/api
```

## API 接口

| 接口 | 描述 |
|------|------|
| `POST /api/v1/auth/login` | 用户认证 |
| `GET /api/v1/datasources` | 获取数据源列表 |
| `POST /api/v1/queries` | 创建 SQL 查询 |
| `POST /api/v1/queries/:id/execute` | 执行查询 |
| `GET /api/v1/tools` | 获取工具列表 |
| `GET /api/v1/mcp-servers` | 获取 MCP 服务器列表 |
| `POST /mcp/:serverId` | MCP 请求处理 |

## 支持的 AI 服务商

| 服务商 | 模型 |
|--------|------|
| OpenAI | GPT-5, GPT-5 Mini, GPT-4o, o3, o3-mini |
| Anthropic | Claude 4 Opus, Claude 4 Sonnet, Claude 3.7 Sonnet, Claude 3.5 Haiku |
| Google | Gemini 2.0 Ultra, Gemini 2.0 Pro, Gemini 2.0 Flash |
| Azure OpenAI | GPT-5, GPT-4o, GPT-4 Turbo |
| 深度求索 | DeepSeek-V3, DeepSeek-R1 |
| 阿里云 | 通义千问 3-Max, 通义千问 2.5-Plus, 通义千问 2.5-Turbo |
| 智谱 AI | GLM-5, GLM-4-Plus, GLM-4-Air |
| Moonshot | Kimi k2, Kimi k1.5 |
| MiniMax | MiniMax-M2.1, MiniMax-M2 |
| 百川智能 | Baichuan 4, Baichuan 3 Turbo |
| 零一万物 | Yi-Lightning, Yi-Large |

## 开源协议

本项目基于 MIT 协议开源 - 详情请查看 [LICENSE](LICENSE) 文件。
