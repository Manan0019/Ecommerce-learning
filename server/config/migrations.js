import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const migrationsDirectory = fileURLToPath(new URL("../migrations/", import.meta.url));

export async function runMigrations(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationFiles = (await fs.readdir(migrationsDirectory))
    .filter(file => file.endsWith(".sql"))
    .sort();
  const appliedResult = await pool.query("SELECT filename FROM schema_migrations");
  const appliedFiles = new Set(appliedResult.rows.map(row => row.filename));

  for (const filename of migrationFiles) {
    if (appliedFiles.has(filename)) continue;

    const migration = await fs.readFile(path.join(migrationsDirectory, filename), "utf8");
    console.log(`Applying database migration: ${filename}`);
    await pool.query(migration);
    await pool.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
  }
}
