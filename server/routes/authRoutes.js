import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";

import pool from "../config/db.js";
import { sendOtpEmail } from "../config/mailer.js";

const router = Router();

const OTP_LIFETIME_MS = 5 * 60 * 1000;
const OTP_RESEND_WAIT_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many signup requests. Try again later."
  }
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many verification requests."
  }
});

// STEP 1: CUSTOMER SIGNUP

router.post("/signup", signupLimiter, async (req, res) => {
  try {
    const { fullName, email, password } = req.body ?? {};

    if (
      typeof fullName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Name, email and password are required."
      });
    }

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (
      cleanName.length < 2 ||
      cleanName.length > 100 ||
      cleanEmail.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
      password.length < 12 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        message: "Check your name, email and password. Password must be at least 12 characters and at most 72 UTF-8 bytes."
      });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = $1",
      [cleanEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Unable to start registration for this email."
      });
    }

    const existingPending = await pool.query(
      `SELECT last_otp_sent_at
       FROM pending_registrations
       WHERE LOWER(email) = $1`,
      [cleanEmail]
    );

    if (existingPending.rows.length > 0) {
      const lastSent = new Date(
        existingPending.rows[0].last_otp_sent_at
      ).getTime();

      if (Date.now() - lastSent < OTP_RESEND_WAIT_MS) {
        return res.status(429).json({
          message: "Please wait before requesting another OTP."
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const otp = crypto.randomInt(100000, 1000000).toString();

    const otpHash = await bcrypt.hash(otp, 10);

    const expiresAt = new Date(
      Date.now() + OTP_LIFETIME_MS
    );

    await pool.query(
      `INSERT INTO pending_registrations
       (
         full_name,
         email,
         password_hash,
         otp_hash,
         otp_expires_at,
         otp_attempts,
         last_otp_sent_at
       )
       VALUES ($1, $2, $3, $4, $5, 0, NOW())
       ON CONFLICT (email)
       DO UPDATE SET
         full_name = EXCLUDED.full_name,
         password_hash = EXCLUDED.password_hash,
         otp_hash = EXCLUDED.otp_hash,
         otp_expires_at = EXCLUDED.otp_expires_at,
         otp_attempts = 0,
         last_otp_sent_at = NOW()`,
      [
        cleanName,
        cleanEmail,
        passwordHash,
        otpHash,
        expiresAt
      ]
    );

    await sendOtpEmail(cleanEmail, otp);

    return res.status(200).json({
      message: "OTP sent. Please check your email."
    });

  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "Unable to start registration for this email."
      });
    }

    console.error("Signup error:", error);

    return res.status(500).json({
      message: "Could not complete signup request."
    });
  }
});

// STEP 2: VERIFY OTP

router.post(
  "/verify-otp",
  verifyLimiter,
  async (req, res) => {
    const { email, otp } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof otp !== "string"
    ) {
      return res.status(400).json({
        message: "Email and OTP are required."
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: "OTP must contain exactly 6 digits."
      });
    }

    let client;
    let transactionStarted = false;

    try {
      client = await pool.connect();

      await client.query("BEGIN");
      transactionStarted = true;

      const result = await client.query(
        `SELECT *
         FROM pending_registrations
         WHERE LOWER(email) = $1
         FOR UPDATE`,
        [cleanEmail]
      );

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(400).json({
          message: "Invalid or expired OTP."
        });
      }

      const pending = result.rows[0];

      if (
        new Date(pending.otp_expires_at).getTime() <
        Date.now()
      ) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(400).json({
          message: "OTP has expired. Request a new one."
        });
      }

      if (pending.otp_attempts >= MAX_OTP_ATTEMPTS) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(429).json({
          message: "Too many incorrect attempts."
        });
      }

      const isValid = await bcrypt.compare(
        otp,
        pending.otp_hash
      );

      if (!isValid) {
        await client.query(
          `UPDATE pending_registrations
           SET otp_attempts = otp_attempts + 1
           WHERE id = $1`,
          [pending.id]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(400).json({
          message: "Invalid OTP."
        });
      }

      await client.query(
        `INSERT INTO users
         (full_name, email, password_hash, role)
         VALUES ($1, $2, $3, 'customer')`,
        [
          pending.full_name,
          pending.email,
          pending.password_hash
        ]
      );

      await client.query(
        `DELETE FROM pending_registrations
         WHERE id = $1`,
        [pending.id]
      );

      await client.query("COMMIT");
      transactionStarted = false;

      return res.status(201).json({
        message: "Account created successfully."
      });

    } catch (error) {
      if (client && transactionStarted) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Rollback error:", rollbackError);
        }
      }

      if (error.code === "23505") {
        return res.status(409).json({
          message: "Account already exists."
        });
      }

      console.error("OTP verification error:", error);

      return res.status(500).json({
        message: "Verification failed."
      });

    } finally {
      if (client) {
        client.release();
      }
    }
  }
);

export default router;