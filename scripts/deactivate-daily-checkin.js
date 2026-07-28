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
  await sql`UPDATE tasks SET active = FALSE, reward_xp = 0 WHERE type = 'daily_checkin'`;
  const rows = await sql`
    SELECT type, title, reward_xp, active FROM tasks WHERE active = TRUE ORDER BY reward_xp DESC
  `;
  console.log(JSON.stringify(rows, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
