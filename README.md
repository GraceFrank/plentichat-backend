# PlentiChat Backend Server

Fast, production-ready backend server for PlentiChat AI agents using Fastify, TypeScript, and Docker.

## Features

- ⚡ **High Performance**: Built with Fastify for maximum throughput
- 🔒 **Secure**: Helmet security headers, rate limiting, and Supabase authentication
- 🤖 **AI-Powered**: LangChain/LangGraph RAG agents with Instagram webhook integration
- 🐳 **Docker Ready**: Production-optimized Docker setup with health checks
- 📝 **TypeScript**: Fully typed with strict mode enabled
- 📊 **Logging**: Structured logging with Pino

## Prerequisites

- Node.js 20+
- Docker & Docker Compose (for containerized deployment)
- Google Cloud KMS (for token encryption)
- Supabase account
- Instagram/Meta App credentials

## Quick Start

### 1. Install Dependencies

```bash
yarn install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase URL
- `SUPABASE_API_KEY` - Supabase service role key
- `INSTAGRAM_APP_SECRET` - Instagram app secret
- `META_VERIFY_TOKEN` - Meta webhook verification token
- `GOOGLE_CLOUD_PROJECT` - GCP project ID
- `GOOGLE_CLOUD_KMS_*` - KMS configuration for token encryption
- `OPENAI_API_KEY` - OpenAI API key

### 3. Development

```bash
yarn dev
```

Server starts at `http://localhost:3001`

### 4. Production Build

```bash
yarn build
yarn start
```

### 5. Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## API Endpoints

### Health Checks

- `GET /health` - Basic health check
- `GET /health/ready` - Readiness check (includes Supabase connectivity)

### Webhooks

- `GET /webhooks/instagram` - Instagram webhook verification
- `POST /webhooks/instagram` - Instagram webhook events (message processing)

### Chat

- `POST /chat/message` - Send message to AI assistant
  - Requires authentication (Bearer token)
  - Body: `{ assistantId: string, text: string }`

## Architecture

```
src/
├── config/          # Environment and logger configuration
├── lib/             # Shared libraries (Supabase, crypto)
├── middleware/      # Auth, error handling
├── routes/          # API route handlers
├── services/        # Business logic
│   ├── agent/       # LangGraph RAG agents
│   ├── knowledge/   # Knowledge base services
│   └── instagram.ts # Instagram messaging
├── types/           # TypeScript type definitions
└── server.ts        # Main entry point
```

## Authentication

The `/chat/message` endpoint requires Supabase authentication. Include the user's access token in the Authorization header:

```
Authorization: Bearer <supabase_access_token>
```

Webhook endpoints use signature verification (no Bearer token required).

## Deployment

### Railway / Render / Fly.io

1. Connect your GitHub repository
2. Set environment variables from `.env.example`
3. Use the provided `Dockerfile` for deployment
4. Ensure port 3001 is exposed

### Google Cloud Run

```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT_ID/plentichat-backend

# Deploy
gcloud run deploy plentichat-backend \
  --image gcr.io/PROJECT_ID/plentichat-backend \
  --platform managed \
  --region us-central1 \
  --set-env-vars "$(cat .env | xargs)"
```

### Vercel (Not Recommended)

This backend is designed for long-running processes and should NOT be deployed to Vercel. Use a dedicated server or container platform instead.

## Monitoring

The server includes:
- Structured JSON logging via Pino
- Health check endpoints for orchestrators
- Request/response logging (dev mode only)

## Security

- Rate limiting: 100 requests per minute per IP
- Helmet security headers enabled
- CORS configured for production domains
- Webhook signature verification
- Token encryption via Google Cloud KMS

## License

MIT
