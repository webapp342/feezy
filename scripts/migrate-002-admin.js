const fs = require("fs");
const { neon } = require("@neondatabase/serverless");

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);

const sql = neon(env.DATABASE_URL);

async function main() {
  await sql`ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_type_key`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS link_url TEXT`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_active ON tasks (active, deleted_at, sort_order, created_at)`;
  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    INSERT INTO app_settings (key, value) VALUES ('snapshot_pool_bonus_sol', '100')
    ON CONFLICT (key) DO NOTHING
  `;
  await sql`
    UPDATE tasks SET link_url = 'https://twitter.com/intent/retweet?tweet_id=2082167574825996588'
    WHERE type = 'twitter_share' AND (link_url IS NULL OR link_url = '') AND deleted_at IS NULL
  `;
  await sql`
    UPDATE tasks SET link_url = 'https://x.com/ZugChain_org'
    WHERE type = 'twitter_follow' AND (link_url IS NULL OR link_url = '') AND deleted_at IS NULL
  `;
  await sql`
    UPDATE tasks SET link_url = 'https://t.me/feezyfun'
    WHERE type = 'telegram_join' AND (link_url IS NULL OR link_url = '') AND deleted_at IS NULL
  `;
  console.log("migration 002 ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
