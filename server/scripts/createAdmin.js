import "dotenv/config";
import bcrypt from "bcrypt";
import pool from "../config/db.js";

async function createAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    const fullName = "Store Administrator";

    if (!email || !password) {
      throw new Error(
        "ADMIN_EMAIL and ADMIN_PASSWORD are required."
      );
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < 12 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      throw new Error(
        "Invalid email or password. Password must be at least 12 characters and at most 72 UTF-8 bytes."
      );
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error(
        "Email already exists. No account was modified."
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users
       (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       RETURNING id, full_name, email, role`,
      [fullName, email, passwordHash]
    );

    console.log("Admin account created:");
    console.log(result.rows[0]);

  } catch (error) {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;

  } finally {
    await pool.end();
  }
}

createAdmin();