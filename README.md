# GitHub-ify

A starter website for GitHub repository recommendations + quick-favorite (star/unstar), with a webhook receiver and app configuration endpoints.

## What this now includes

- A homepage you can use as your GitHub App **Homepage URL**
- A working GitHub webhook endpoint with HMAC SHA-256 signature verification
- A callback endpoint you can use as your GitHub App/OAuth callback URL
- A JSON endpoint that prints the exact URLs to copy into GitHub settings

## Run locally

```bash
cp .env.example .env
node server.js
```

Open:
- `http://localhost:3000/` (homepage)
- `http://localhost:3000/app/config` (URL helper JSON)

## Endpoints

- `GET /` - homepage
- `GET /health` - health check
- `GET /app/config` - returns app URLs:
  - `homepageUrl`
  - `webhookUrl`
  - `callbackUrl`
- `GET /auth/github/callback` - callback placeholder endpoint
- `POST /webhook/github` - GitHub webhook receiver

## GitHub App setup values

After deployment, use your deployed domain in `APP_BASE_URL`.

Then set:
- **Homepage URL** = `https://your-domain.com/`
- **Webhook URL** = `https://your-domain.com/webhook/github`
- **Callback URL** = `https://your-domain.com/auth/github/callback`

Tip: Visit `/app/config` on your deployed site to copy the exact values.

## Required GitHub App permissions for your use case

Minimum permissions for recommendations + quick-favorite:

### Repository permissions
- **Metadata: Read-only** (required)
- **Contents: Read-only** (recommended)
- **Issues: Read-only** (optional quality signal)
- **Pull requests: Read-only** (optional quality signal)

### Account permissions
- **Starring: Read and write** (required for quick-favorite)

### Webhooks to subscribe
- `star`
- `installation`
- `installation_repositories`

## Next implementation tasks

- Persist webhook events and favorite state in a database
- Exchange callback `code` for user tokens
- Build recommendation ranking service and API
- Add frontend list + quick-favorite button
