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
  await sql`UPDATE tasks SET title = 'RT + Tag 3 friends', reward_xp = 5000, active = TRUE WHERE type = 'twitter_share'`;
  await sql`UPDATE tasks SET title = 'Join Telegram', reward_xp = 5000, active = TRUE WHERE type = 'telegram_join'`;
  await sql`UPDATE tasks SET title = 'Daily check-in', reward_xp = 0, active = FALSE WHERE type = 'daily_checkin'`;
  await sql`UPDATE tasks SET active = FALSE, reward_xp = 0 WHERE type = 'discord_join'`;
  await sql`
    INSERT INTO tasks (type, title, reward_xp, active)
    VALUES ('twitter_follow', 'Follow on X', 2500, TRUE)
    ON CONFLICT (type) DO UPDATE SET
      title = EXCLUDED.title,
      reward_xp = EXCLUDED.reward_xp,
      active = TRUE
  `;
  const rows = await sql`
    SELECT type, title, reward_xp, active FROM tasks ORDER BY reward_xp DESC, type ASC
  `;
  console.log(JSON.stringify(rows, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
