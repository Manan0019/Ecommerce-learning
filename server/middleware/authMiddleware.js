import pool from "../config/db.js";

export async function requireCustomer(req, res, next) {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({
        message: "Please log in."
      });
    }

    const result = await pool.query(
      `SELECT id, full_name, email, role
       FROM users
       WHERE id = $1`,
      [req.session.userId]
    );

    const user = result.rows[0];

    if (!user || user.role !== "customer") {
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


export async function requireAdmin(req, res, next) {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({
        message: "Admin login required."
      });
    }

    const result = await pool.query(
      `SELECT id, full_name, email, role
       FROM users
       WHERE id = $1`,
      [req.session.userId]
    );

    const user = result.rows[0];

    if (!user || user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access denied."
      });
    }

    req.user = user;

    next();

  } catch (error) {
    console.error("Admin authorization error:", error);

    return res.status(500).json({
      message: "Authorization check failed."
    });
  }
}
