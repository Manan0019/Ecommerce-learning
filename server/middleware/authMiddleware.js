import pool from "../config/db.js";

export async function requireAuthenticated(req, res, next) {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({
        message: "Please log in."
      });
    }

    const result = await pool.query(
      `SELECT id, full_name, email, mobile_number, profile_image_url, role
       FROM users
       WHERE id = $1`,
      [req.session.userId]
    );

    const user = result.rows[0];

    if (!user || !["admin", "customer"].includes(user.role)) {
      return res.status(403).json({
        message: "Access denied."
      });
    }

    req.user = user;

    next();

  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(500).json({
      message: "Authentication check failed."
    });
  }
}


function requireRole(role) {
  return (req, res, next) => requireAuthenticated(req, res, () => {
    if (req.user.role !== role) {
      return res.status(403).json({ message: "Access denied." });
    }
    return next();
  });
}

export const requireCustomer = requireRole("customer");
export const requireAdmin = requireRole("admin");