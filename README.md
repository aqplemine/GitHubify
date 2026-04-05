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
Get recommendations on all sorts of GitHub repositories and stuff. Built with chatgpt-codex.

## Feature concept: Popular repo recommendations + Quick Favorite

You can absolutely build this with a GitHub App.

### 1) Popular repository recommendations

Recommend repos using signals like:
- Trending stars in the last 7/30 days
- Total stars and forks
- Recent commit activity
- Topic match (e.g. `ai`, `typescript`, `devops`)
- Language match (e.g. Python, Go, TypeScript)
- User/org affinity (repos the user already watches/stars)

Suggested implementation flow:
1. Fetch candidate repos via GitHub Search API (topic/language based).
2. Score each repo with a weighted formula.
3. Return top N recommendations.
4. Refresh scores periodically (cron/worker) and cache results.

Example scoring formula:
- `score = (new_stars_30d * 0.45) + (recent_commits * 0.25) + (forks * 0.15) + (topic_match * 0.15)`

### 2) Quick Favorite (star/unstar shortcut)

Add a one-click “Favorite” button in your UI that toggles a repository star on behalf of the user.

- If not starred -> call “star repository”
- If already starred -> call “unstar repository”

Also include a local DB table for faster UI state:
- `user_repo_favorites(user_id, repo_id, is_favorite, updated_at)`

Sync strategy:
- Optimistically update UI
- Attempt GitHub API write
- If API fails, rollback local state and show error

---

## GitHub App permissions you should enable

If your app only does recommendations + quick-favorite, these are the minimum practical permissions:

### Repository permissions

1. **Metadata: Read-only** (required)
   - Lets you read basic repository details.

2. **Contents: Read-only** (recommended)
   - Useful for lightweight repo signals (default branch presence, activity context).

3. **Issues: Read-only** (optional)
   - Optional quality signal (issue activity/health).

4. **Pull requests: Read-only** (optional)
   - Optional quality signal (PR throughput/maintenance).

### Account permissions

5. **Starring: Read and write** (required for Quick Favorite)
   - Required to star/unstar repositories for a user.

### Events / Webhooks (recommended)

Enable these webhooks to keep your local state in sync:
- `star` (critical for favorite sync)
- `installation`
- `installation_repositories`

---

## OAuth vs GitHub App note (important)

For **user-level starring**, use a **GitHub App with user-to-server tokens**.
You need the user to authorize your app so actions happen on behalf of that user.

If you also support personal accounts and want broader search/rate limits, you can pair this with OAuth login, but the starring action should still use the user-authorized token path.

---

## API endpoints to implement

- `GET /api/recommendations?language=ts&topic=ai`
  - Returns ranked repository recommendations

- `PUT /api/favorites/:owner/:repo`
  - Stars (favorites) a repo for the authenticated user

- `DELETE /api/favorites/:owner/:repo`
  - Unstars (removes favorite)

- `GET /api/favorites`
  - Returns the user’s current favorites list

---

## Minimal launch checklist

- [ ] Create GitHub App with permissions above
- [ ] Implement user authorization flow
- [ ] Store encrypted user access tokens
- [ ] Build recommendation ranking service
- [ ] Add quick-favorite toggle in UI
- [ ] Subscribe to `star` webhook for synchronization
- [ ] Add retry + rollback on favorite API failures

