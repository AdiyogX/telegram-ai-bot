# Render Deployment Guide

## Prerequisites
- A Render account
- A GitHub repository with the code
- Telegram Bot Token (from @BotFather)
- NVIDIA AI API Key

## Deploy on Render

### Using Render Dashboard

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `telegram-ai-bot`
   - **Runtime**: `Docker`
   - **Branch**: `main`
   - **Health Check Path**: `/health`
   - **Auto-Deploy**: `Yes`

5. Add Environment Variables:
   - `TELEGRAM_BOT_TOKEN`: your bot token
   - `NVIDIA_API_KEY`: your NVIDIA API key
   - `NODE_ENV`: `production`
   - `WEBHOOK_URL`: `https://your-app.onrender.com`
   - `WEBHOOK_SECRET`: a random secret string
   - `ADMIN_IDS`: comma-separated Telegram user IDs (optional)

6. Click "Create Web Service"

### Using `render.yaml`

```yaml
services:
  - type: web
    name: telegram-ai-bot
    env: docker
    repo: https://github.com/your-username/telegram-ai-bot
    branch: main
    healthCheckPath: /health
    autoDeploy: true
    envVars:
      - key: TELEGRAM_BOT_TOKEN
        sync: false
      - key: NVIDIA_API_KEY
        sync: false
      - key: NODE_ENV
        value: production
      - key: WEBHOOK_URL
        value: https://telegram-ai-bot.onrender.com
      - key: WEBHOOK_SECRET
        generateValue: true
```

## Setting the Webhook

Once deployed, the bot will automatically set the webhook using the `WEBHOOK_URL` environment variable.

### Manual Webhook Setup

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-app.onrender.com/webhook&secret_token=<YOUR_SECRET>"
```

## CI/CD

The GitHub Actions workflow in `.github/workflows/ci-cd.yml`:
1. Runs on push to `main` and PRs
2. Lints, typechecks, and tests
3. Builds the application
4. Deploys to Render via deploy hook

### Setup Render Deploy Hook

1. On Render dashboard, go to your service → "Settings" → "Deploy Hook"
2. Copy the deploy hook URL
3. Add it as a GitHub secret: `RENDER_DEPLOY_HOOK_URL`

## Monitoring

- **Health endpoint**: `https://your-app.onrender.com/health`
- **Metrics**: `https://your-app.onrender.com/metrics`
- **Logs**: Available in Render dashboard
- **Local logs**: Written to `./logs/` directory
