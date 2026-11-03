# CodeMates (DevTinder) API

Node.js + Express + MongoDB backend for a developer networking app: signup/login,
profiles, a swipe-style feed, connection requests, and messaging between accepted
connections.

## Requirements

- Node.js 20 or newer
- A MongoDB database (Atlas or local)

## Setup

```bash
npm install
cp .env.example .env   # On Windows: Copy-Item .env.example .env
```

Fill in the values in `.env`:

| Variable       | Required | Description                                                        |
| -------------- | -------- | ------------------------------------------------------------------ |
| `MONGODB_URI`  | yes      | MongoDB connection string                                          |
| `JWT_SECRET`   | yes      | Long random secret used to sign auth tokens                        |
| `PORT`         | no       | HTTP port (default `3000`)                                         |
| `FRONTEND_URL` | no       | Comma-separated CORS origins (defaults include `localhost:5173`)   |
| `NODE_ENV`     | no       | Set to `production` on a deployed server                           |
| `DNS_SERVERS`  | no       | Optional comma-separated resolvers if system DNS cannot reach Atlas |

## Run

```bash
npm run dev     # node --watch
npm start       # production
```

## Test

```bash
npm test          # unit checks (no database required)
npm run test:smoke  # HTTP checks; expects the API on http://localhost:3000
```

To run smoke tests against another server:

```powershell
$env:BASE="https://your-api.example.com"; npm run test:smoke
```

See [TESTING.md](./TESTING.md) for the full manual test plan and
[apiList.md](./apiList.md) for the endpoint reference.

## Upgrade note

Connection requests now use a unique `pairKey` to prevent duplicate/opposite
requests. On an existing database, backfill it once:

```bash
npm run db:backfill-pair-key
```

## Structure

```text
src/
  app.js                 Express app, CORS, security headers, error handling
  config/database.js     MongoDB connection
  middleware/auth.js     JWT cookie authentication
  middleware/rateLimit.js Login/signup brute-force protection
  models/                Mongoose schemas
  routes/                auth, profile, requests, users, messages
  utils/                 validation, errors, cookies, public user serializer
scripts/                 one-off database migrations
tests/                   unit + smoke checks
```
