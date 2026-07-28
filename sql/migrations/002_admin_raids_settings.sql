-- Admin / raids / settings migration (run once)

-- Soft-delete + optional link; allow same type with new UUID rows
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_type_key;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS link_url TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tasks_active
  ON tasks (active, deleted_at, sort_order, created_at);

-- Never hard-delete task rows that users completed (prefer soft-delete).
-- user_tasks.task_id stays valid forever via UUID.

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (key, value) VALUES
  ('snapshot_pool_bonus_sol', '100')
ON CONFLICT (key) DO NOTHING;
