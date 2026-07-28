# Feezy

Creator-fee meme coin site: random XP-weighted snapshots, wallet auth, raids, referrals, Redis leaderboard.

## Stack

- **Frontend:** Next.js (App Router) + Solana Wallet Adapter
- **API:** Next.js Route Handlers (Vercel serverless)
- **DB:** Neon PostgreSQL
- **Cache / leaderboard:** Upstash Redis
- **Chain:** Solana RPC (balance verified on the server)

## Quick start

1. Copy env file and fill values (see end of this README / `.env.example`):

```bash
cp .env.example .env.local
```

2. Run `sql/schema.sql` in the Neon SQL Editor.

3. Install & run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/api/auth` | — | `nonce` / `verify` wallet signature |
| DELETE | `/api/auth` | — | Clear session |
| POST | `/api/sync-wallet` | session | Backend RPC → XP → Redis ZADD |
| GET | `/api/leaderboard` | — | Redis only, cached 15s |
| GET | `/api/me` | session | Profile + XP breakdown |
| GET/POST | `/api/tasks` | POST needs session | Generic task list / claim |

## Flow

1. User connects wallet and signs a nonce message.
2. Backend verifies signature, sets httpOnly session, creates user (+ referral_pending if `?ref=`).
3. `POST /api/sync-wallet` reads token balance from Solana RPC, recalculates XP, updates Postgres + Redis.
4. UI leaderboard always reads Redis — never Postgres.

## Free-tier notes

- Leaderboard responses use `Cache-Control: s-maxage=15`.
- Sync is rate-limited per wallet (`SYNC_COOLDOWN_SECONDS`).
- Do not poll the leaderboard every few seconds.
