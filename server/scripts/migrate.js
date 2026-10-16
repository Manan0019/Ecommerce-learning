import pool from "../config/db.js";
import { runMigrations } from "../config/migrations.js";

try {
  await runMigrations(pool);
  console.log("Database migrations are up to date.");
} catch (error) {
  console.error("Database migration failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
