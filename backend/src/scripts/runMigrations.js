import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const run = async () => {
  const migrationsDir = path.join(__dirname, "../db/migrations");
  const files = (await fs.readdir(migrationsDir)).sort();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const { rows: legacyCheck } = await pool.query(
    "SELECT to_regclass('public.roles') AS roles_table"
  );

  if (legacyCheck[0]?.roles_table) {
    await pool.query(
      `INSERT INTO schema_migrations (filename)
       VALUES ('001_initial_schema.sql')
       ON CONFLICT (filename) DO NOTHING`
    );
  }

  const { rows: appliedRows } = await pool.query(
    "SELECT filename FROM schema_migrations"
  );
  const applied = new Set(appliedRows.map((row) => row.filename));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Skipping already applied migration: ${file}`);
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    await pool.query(sql);
    await pool.query(
      "INSERT INTO schema_migrations (filename) VALUES ($1)",
      [file]
    );
    console.log(`Applied migration: ${file}`);
  }

  await pool.end();
};

run().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
