# Bookipi (Node + React)

## Requirements
- Node.js 18+ recommended
- PostgreSQL (recommended via Docker Desktop)

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

