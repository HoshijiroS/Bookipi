# Bookipi (Node + React)

## Description
- This is a simple flash sale platform designed to handle a large number of concurrent requests.

## General Architecture
- Server is written in Node.js and Express. Express has been selected for built-in rate limiting functionalities.
- Database is in PostgreSQL to leverage functionalities such as adding constraints to the columns and tables. Constraints added ensure user ID is unique to place an order and only 1 stock per transaction is allowed.
- Caching is done in Redis for often accessed endpoints such as those to check for flash sale status and stock count.
- Vite is chosen as the builder for its build speed.
- React is chosen as the client for its data fetching hooks.
- Vitest is chosen as the unit test runner for its compatibility with Vite.

## Requirements
- Node.js 19+ recommended
- PostgreSQL (recommended via Docker Desktop)
- Redis (recommended via Docker Desktop)

## Run in dev
```bash
npm install
copy server\\.env.example server\\.env
npm run -w server migrate
npm run dev:server
```

In another terminal:

```bash
npm run dev:client
```

## Database
- This starter uses **Postgres** via `DATABASE_URL` (see `server/.env.example`).
- If you have Docker Desktop installed, you can run Postgres with:

```bash
docker compose up -d
```

## Run both (server + client)
```bash
npm install
npm run dev
```

- API: `http://localhost:3001`
- Web: `http://localhost:5173`

# Load & stress test scripts

Simulate heavy traffic against the Bookipi API (ensure server is running on port 3001).

## Load test (sustained traffic)

- **`npm run load-test`** - 20 concurrent workers, 30 seconds, mix of GET /api/products, /api/flash-sale, /api/flash-sale/status
- **`npm run load-test:heavy`** - 50 workers, 60 seconds

Options (env in /scripts or CLI):

- `BASE_URL` - default `http://localhost:3001`
- `CONCURRENCY` / 1st arg - concurrent workers
- `DURATION_SEC` / 2nd arg - run duration in seconds
- `RPS_CAP` - max requests per second per worker (default 10; 0 = unlimited)
- `CHECKOUT_PCT` - 0–100, percentage of requests that are POST /api/checkout (unique user IDs)

Examples:

```bash
node scripts/load-test.js 30 45
CHECKOUT_PCT=10 node scripts/load-test.js
```

## Stress test (burst)

- **`npm run stress-test`** - 100 concurrent workers, 500 requests total (GETs only)

Options:

- `CONCURRENCY` - default 100
- `BURST_REQUESTS` - default 500
- `BASE_URL` - default `http://localhost:3001`

Note: the API uses a rate limiter (120 req/min per IP). For higher load you may need to relax or disable it in the server during tests.

