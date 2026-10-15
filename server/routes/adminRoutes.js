import { Router } from "express";
import pool from "../config/db.js";
import { requireAdmin } from "../middleware/authMiddleware.js";

const router = Router();

// Every route below requires an admin account.
router.use(requireAdmin);

// GET REGISTERED CUSTOMERS
router.get("/customers", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         full_name,
         email,
         created_at
       FROM users
       WHERE role = 'customer'
       ORDER BY created_at DESC, id DESC
       LIMIT 100`
    );

    return res.json({
      customers: result.rows.map((customer) => ({
        id: String(customer.id),
        fullName: customer.full_name,
        email: customer.email,
        createdAt: customer.created_at
      }))
    });

  } catch (error) {
    console.error("Customer listing error:", error);

    return res.status(500).json({
      message: "Could not load customers."
    });
  }
});

// ADMIN PROFILE
router.get("/me", (req, res) => {
  return res.json({
    user: {
      id: String(req.user.id),
      fullName: req.user.full_name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

export default router;