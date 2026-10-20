import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import multer from "multer";

import pool from "../config/db.js";
import { sendOtpEmail } from "../config/mailer.js";

import { requireAuthenticated, requireCustomer } from "../middleware/authMiddleware.js";
// Customer profile photos are no longer accepted. Existing stored photos are
// retained in old records for backwards compatibility; the UI no longer uses them.

const router = Router();

const OTP_LIFETIME_MS = 5 * 60 * 1000;
const OTP_RESEND_WAIT_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const PASSWORD_MIN_LENGTH = 12;

function validPassword(password) {
  return typeof password === "string" &&
    password.length >= PASSWORD_MIN_LENGTH &&
    Buffer.byteLength(password, "utf8") <= 72;
}

function normalizeMobile(value) {
  if (typeof value !== "string") return null;
  const mobile = value.trim().replace(/[\s()-]/g, "");
  return /^\+?[1-9]\d{7,14}$/.test(mobile) ? mobile : null;
}

function hasOnlyKeys(body, allowed) {
  return body && Object.keys(body).every((key) => allowed.has(key));
}

function safeUser(user) {
  return {
    id: String(user.id),
    fullName: user.full_name,
    email: user.email,
    mobileNumber: user.mobile_number ?? null,
    profileImageUrl: user.profile_image_url ?? null,
    role: user.role
  };
}

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    message: "Too many signup requests. Try again later."
  }
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    message: "Too many verification requests."
  }
});

// STEP 1: CUSTOMER SIGNUP

router.post("/signup", signupLimiter, multer().none(), async (req, res) => {
  try {
    const { fullName, email, mobileNumber, password, confirmPassword } = req.body ?? {};

    if (
      !hasOnlyKeys(req.body, new Set([
        "fullName", "email", "mobileNumber", "password", "confirmPassword"
      ])) ||
      typeof fullName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof confirmPassword !== "string"
    ) {
      return res.status(400).json({
        message: "Name, email, mobile number, password and confirmation are required."
      });
    }

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = normalizeMobile(mobileNumber);

    if (
      cleanName.length < 2 ||
      cleanName.length > 100 ||
      cleanEmail.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
      !cleanMobile ||
      !validPassword(password)
    ) {
      return res.status(400).json({
        message: "Check your name, email, mobile number and password. Password must be at least 12 characters and at most 72 UTF-8 bytes."
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
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
      `SELECT last_otp_sent_at, profile_image_url
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
         mobile_number,
         profile_image_url,
         password_hash,
         otp_hash,
         otp_expires_at,
         otp_attempts,
         last_otp_sent_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, NOW())
       ON CONFLICT (email)
       DO UPDATE SET
         full_name = EXCLUDED.full_name,
         mobile_number = EXCLUDED.mobile_number,
         profile_image_url = NULL,
         password_hash = EXCLUDED.password_hash,
         otp_hash = EXCLUDED.otp_hash,
         otp_expires_at = EXCLUDED.otp_expires_at,
         otp_attempts = 0,
         last_otp_sent_at = NOW()`,
      [
        cleanName,
        cleanEmail,
        cleanMobile,
        null,
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
         (full_name, email, mobile_number, profile_image_url, password_hash, role)
         VALUES ($1, $2, $3, $4, $5, 'customer')`,
        [
          pending.full_name,
          pending.email,
          pending.mobile_number,
          pending.profile_image_url,
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


const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    message: "Too many login attempts. Try again later."
  }
});

// Retain the old API URL as an alias of the unified handler.
router.post(["/login", "/admin/login"], loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `SELECT id, full_name, email, mobile_number, profile_image_url, password_hash, role
       FROM users
       WHERE LOWER(email) = $1`,
      [cleanEmail]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    if (!["admin", "customer"].includes(user.role)) {
      return res.status(403).json({
        message: "Access denied."
      });
    }

    req.session.regenerate((error) => {
      if (error) {
        console.error("Session regeneration failed:", error);
        return res.status(500).json({
          message: "Could not create login session."
        });
      }

      req.session.userId = String(user.id);
      req.session.role = user.role;

      req.session.save((saveError) => {
        if (saveError) {
          console.error("Session save failed:", saveError);
          // Prevent Express from retrying a failed save while sending the error.
          req.session = null;
          return res.status(500).json({
            message: "Could not save login session."
          });
        }

        return res.status(200).json({
          message: "Login successful.",
          user: safeUser(user)
        });
      });
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Login failed."
    });
  }
});


// CURRENT AUTHENTICATED USER

router.get("/me", requireAuthenticated, (req, res) => {
  res.json({
    user: safeUser(req.user)
  });
});

router.patch("/profile/name", requireCustomer, async (req, res) => {
  if (!hasOnlyKeys(req.body, new Set(["fullName"])) ||
      typeof req.body.fullName !== "string") {
    return res.status(400).json({ message: "Only fullName can be changed here." });
  }

  const fullName = req.body.fullName.trim();
  if (fullName.length < 2 || fullName.length > 100) {
    return res.status(400).json({ message: "Full name must be 2 to 100 characters." });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE users SET full_name = $1 WHERE id = $2 AND role = 'customer'
       RETURNING id, full_name, email, mobile_number, profile_image_url, role`,
      [fullName, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Customer not found." });
    return res.json({ message: "Name updated successfully.", user: safeUser(rows[0]) });
  } catch (error) {
    console.error("Name update error:", error);
    return res.status(500).json({ message: "Could not update name." });
  }
});

router.patch("/profile/password", requireCustomer, async (req, res) => {
  const allowed = new Set(["currentPassword", "newPassword", "confirmPassword"]);
  const { currentPassword, newPassword, confirmPassword } = req.body ?? {};
  if (!hasOnlyKeys(req.body, allowed) ||
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string") {
    return res.status(400).json({ message: "Current, new and confirmed passwords are required." });
  }
  if (!validPassword(newPassword)) {
    return res.status(400).json({
      message: "New password must be at least 12 characters and at most 72 UTF-8 bytes."
    });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "New passwords do not match." });
  }

  try {
    const { rows } = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1 AND role = 'customer'",
      [req.user.id]
    );
    if (!rows.length || !await bcrypt.compare(currentPassword, rows[0].password_hash)) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2 AND role = 'customer'",
      [passwordHash, req.user.id]
    );
    return res.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Password update error:", error);
    return res.status(500).json({ message: "Could not update password." });
  }
});

// LOGOUT

router.post("/logout", (req, res) => {
  const hadSession = Boolean(req.session?.userId);

  if (!hadSession) {
    return res.status(401).json({
      message: "Not logged in."
    });
  }

  req.session.destroy((error) => {
    if (error) {
      console.error("Logout failed:", error);

      return res.status(500).json({
        message: "Could not log out."
      });
    }

    res.clearCookie("ecommerce.sid", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });

    return res.json({
      message: "Logged out successfully."
    });
  });
});

// Reject any attempted multipart file upload rather than accepting a photo.
router.use((error, _req, res, next) => {
  if (error?.code === "LIMIT_UNEXPECTED_FILE") return res.status(400).json({message:"Profile photos are not supported. Create your account without an image."});
  next(error);
});

export default router;
