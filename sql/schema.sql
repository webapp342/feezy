-- Run once in Neon SQL Editor (or psql) before starting the app.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address  TEXT NOT NULL UNIQUE,
  referrer_id     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_wallet ON users (wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_referrer ON users (referrer_id);

CREATE TABLE IF NOT EXISTS wallet_state (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  old_balance          NUMERIC(36, 0) NOT NULL DEFAULT 0,
  last_sync            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  onchain_first_tx_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS xp_state (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  holding_xp    INTEGER NOT NULL DEFAULT 0,
  wallet_age_xp INTEGER NOT NULL DEFAULT 0,
  task_xp       INTEGER NOT NULL DEFAULT 0,
  referral_xp   INTEGER NOT NULL DEFAULT 0,
  total_xp      INTEGER NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- type is NOT unique: each raid row has forever-unique UUID (soft-delete safe)
CREATE TABLE IF NOT EXISTS tasks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  reward_xp  INTEGER NOT NULL CHECK (reward_xp >= 0),
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  link_url   TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_active
  ON tasks (active, deleted_at, sort_order, created_at);

CREATE TABLE IF NOT EXISTS user_tasks (
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id      UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, task_id)
);

CREATE TABLE IF NOT EXISTS referral_pending (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee_id      UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_referral_pending_status
  ON referral_pending (status);

CREATE TABLE IF NOT EXISTS sync_locks (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  locked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (key, value) VALUES
  ('snapshot_pool_bonus_sol', '100')
ON CONFLICT (key) DO NOTHING;
