# GitHub-ify

GitHub-ify is now a deployable starter website for your GitHub App onboarding flow:
- Landing page users can visit
- “Add GitHub App” install button
- OAuth start/callback endpoints
- Signed webhook endpoint
- Admin endpoint to verify installations via your app private key

## Quick start

```bash
cp .env.example .env
node server.js
```

## Deploy (no localhost)

Deploy to any public HTTPS host (Railway, Render, Fly.io, VPS, etc.) and set environment variables from `.env.example`.

If `APP_BASE_URL` is set (recommended), the server uses it everywhere.
If not set, URLs are derived from incoming `Host` + `X-Forwarded-Proto`, so it still works behind proxies.

## Homepage URL users can visit

Your public root URL:
- `https://your-domain.com/`

This page includes:
- **Add GitHub App** button (uses `GITHUB_APP_SLUG`)
- **Connect GitHub Account** button (`/auth/github/start`)
- Live config links for GitHub App settings

## Configure your GitHub App with these values

- **Homepage URL** = `https://your-domain.com/`
- **Webhook URL** = `https://your-domain.com/webhook/github`
- **Callback URL** = `https://your-domain.com/auth/github/callback`

You can copy exact values from:
- `GET /app/config`

## Endpoints

### Public
- `GET /` - landing page with “Add GitHub App” CTA
- `GET /health` - health status
- `GET /app/config` - generated config values + environment readiness
- `GET /auth/github/start` - starts OAuth with GitHub
- `GET /auth/github/callback` - handles callback and code exchange if secrets are present
- `GET /api/github/install-url` - returns install URL based on `GITHUB_APP_SLUG`
- `POST /webhook/github` - verifies webhook signature and accepts events

### Admin (requires `x-admin-token`)
- `GET /api/github/app/installations` - signs GitHub App JWT with `GITHUB_APP_PRIVATE_KEY` and lists installations

## Required environment variables

- `GITHUB_APP_SLUG` for install URL
- `GITHUB_WEBHOOK_SECRET` for secure webhooks
- `GITHUB_APP_CLIENT_ID` and `GITHUB_APP_CLIENT_SECRET` for OAuth code exchange
- `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY` for GitHub App JWT (admin installation checks)
- `ADMIN_TOKEN` to protect admin endpoints

## Security notes

- Keep `GITHUB_APP_PRIVATE_KEY` and `GITHUB_APP_CLIENT_SECRET` server-only.
- Do not expose secrets in frontend JS.
- Set a strong `ADMIN_TOKEN` in production.

## GitHub App permissions (for recommendation + quick-favorite)

### Repository permissions
- **Metadata: Read-only** (required)
- **Contents: Read-only** (recommended)
- **Issues: Read-only** (optional signal)
- **Pull requests: Read-only** (optional signal)

### Account permissions
- **Starring: Read and write** (required for quick-favorite star/unstar)

### Webhooks
- `star`
- `installation`
- `installation_repositories`
