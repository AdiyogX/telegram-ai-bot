# Telegram AI Bot

A production-grade Telegram AI chatbot powered by NVIDIA AI APIs with enterprise architecture, MCP integration, and automated CI/CD.

## Features

- **AI Chat**: Natural conversations powered by NVIDIA AI (Llama, Mistral, Mixtral models)
- **Context Memory**: Maintains conversation history across sessions
- **Multi-Model**: Switch between different AI models
- **Commands**: /start, /help, /reset, /ping, /stats, /about, /settings, /admin
- **Inline Keyboards**: Interactive settings panels
- **Webhook/Polling**: Supports both modes
- **Rate Limiting**: Built-in abuse prevention
- **Session Management**: Automatic cleanup of expired sessions
- **Health Endpoint**: Production monitoring ready
- **Prometheus Metrics**: Observability built-in
- **Structured Logging**: Pino-based with file rotation
- **Docker**: Containerized deployment
- **CI/CD**: GitHub Actions pipeline
- **Render**: One-click deployment

## Quick Start

### Prerequisites

- Node.js 20+
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- NVIDIA AI API Key (from [NVIDIA AI](https://www.nvidia.com/en-us/ai/))

### Local Development

```bash
# Clone and install
git clone <repo-url>
cd telegram-ai-bot
npm install

# Set up environment
cp .env.example .env
# Edit .env with your tokens

# Run in development
npm run dev

# Build
npm run build

# Run production
npm start
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from @BotFather |
| `NVIDIA_API_KEY` | Yes | NVIDIA AI API key |
| `NVIDIA_MODEL` | No | Default model (default: meta/llama-3.1-8b-instruct) |
| `PORT` | No | Server port (default: 3000) |
| `HOST` | No | Server host (default: 0.0.0.0) |
| `WEBHOOK_URL` | No | Webhook URL (set for production) |
| `WEBHOOK_SECRET` | No | Webhook secret token |
| `ADMIN_IDS` | No | Comma-separated admin Telegram IDs |
| `LOG_LEVEL` | No | Logging level (default: info) |

## Architecture

```
src/
├── index.ts           # Application entry point & bot setup
├── config/            # Environment configuration & validation
├── constants/         # App constants, commands, error messages
├── types/             # TypeScript type definitions
├── interfaces/        # Interface contracts
├── database/          # SQLite database layer
├── ai/                # NVIDIA AI service integration
├── services/          # Session management & business logic
├── handlers/          # Command & message handlers
├── middleware/        # Request processing middleware
├── server/            # Fastify HTTP server (health, metrics)
├── mcp/               # MCP tool registration & management
├── browser/           # Browser automation interface
└── utils/             # Logger & utilities
```

## API Endpoints

- `GET /` - Bot information
- `GET /health` - Health check (used by Render)
- `GET /metrics` - Prometheus metrics
- `POST /webhook` - Telegram webhook receiver

## Deployment

See [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy

1. Push code to GitHub
2. On Render, create a new Web Service
3. Select Docker runtime
4. Add environment variables
5. Deploy

## Testing

```bash
npm test           # Run tests
npm run test:watch # Watch mode
npm run test:coverage # Coverage report
```

## License

MIT
