# DataWeaver

**DataWeaver** is an enterprise-grade data management and AI integration platform that bridges traditional databases with modern AI systems through the Model Context Protocol (MCP).

[简体中文](README.zh-CN.md)

## Features

- **Multi-Database Support**: Connect to MySQL, PostgreSQL, SQL Server, and Oracle databases
- **Query Builder**: Create and manage parameterized SQL queries with validation
- **Tool Generation**: Transform queries into reusable AI-callable tools
- **MCP Server**: Expose tools via Model Context Protocol for AI assistant integration
- **Real-time Monitoring**: Track query executions, API calls, and system statistics
- **Multi-AI Provider Support**: Compatible with OpenAI, Anthropic, Google, and various Chinese AI providers
- **Secure by Design**: Encrypted credential storage, JWT authentication, and API key protection

## Architecture

```
┌─────────────────┐                              ┌─────────────────┐
│   AI Assistants │                              │  React Frontend │
│  (Claude, GPT)  │                              │   (Dashboard)   │
└────────┬────────┘                              └────────┬────────┘
         │                                                │
         ▼                                                │
┌─────────────────┐                                       │
│   MCP Server    │                                       │
│   (HTTP/SSE)    │                                       │
└────────┬────────┘                                       │
         │                                                │
         └───────────────────────┬────────────────────────┘
                                 ▼
                 ┌─────────────────────────────────┐
                 │     DataWeaver Backend API      │
                 └──────┬──────────────────┬───────┘
                        │                  │
                        ▼                  ▼
             ┌─────────────────┐    ┌─────────────────┐
             │   PostgreSQL    │    │  External DBs   │
             │   (Metadata)    │    │ MySQL/PG/MSSQL  │
             └─────────────────┘    └─────────────────┘
```

## Tech Stack

### Backend
- **Go 1.24** with Gin web framework
- **GORM** for ORM and database migrations
- **JWT** for authentication
- **Zap** for structured logging
- **Swagger** for API documentation

### Frontend
- **React 19** with TypeScript
- **Vite** for build tooling
- **TailwindCSS** with shadcn/ui components
- **Zustand** for state management
- **TanStack Query** for server state

## Quick Start

### Prerequisites
- Go 1.24+
- Node.js 18+
- PostgreSQL 15+

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/dataweaver.git
cd dataweaver

# Install dependencies
make deps

# Configure the application
cp config/config.yaml.example config/config.yaml
# Edit config/config.yaml with your database settings

# Run the server
make run
```

### Frontend Setup

```bash
cd dataweaver-frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env: VITE_API_BASE_URL=http://localhost:8080/api

# Start development server
npm run dev
```

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## Configuration

### Backend (`config/config.yaml`)

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
  secret: your-secret-key-change-in-production
  expire_hours: 24

encryption:
  key: 12345678901234567890123456789012  # Must be 32 bytes
```

### Frontend (`.env`)

```
VITE_API_BASE_URL=http://localhost:8080/api
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/auth/login` | User authentication |
| `GET /api/v1/datasources` | List data sources |
| `POST /api/v1/queries` | Create SQL query |
| `POST /api/v1/queries/:id/execute` | Execute query |
| `GET /api/v1/tools` | List tools |
| `GET /api/v1/mcp-servers` | List MCP servers |
| `POST /mcp/:serverId` | MCP request handler |

## Supported AI Providers

| Provider | Models |
|----------|--------|
| OpenAI | GPT-4, GPT-4 Turbo |
| Anthropic | Claude 3 Opus, Sonnet, Haiku |
| Google | Gemini Pro, Ultra |
| DeepSeek | DeepSeek Chat |
| Alibaba | Qwen Turbo, Max |
| Zhipu AI | GLM-4, GLM-3 Turbo |
| Moonshot | Moonshot v1 |
| Baichuan | Baichuan2-Turbo |
| 01.AI | Yi-Large, Yi-Medium |

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
