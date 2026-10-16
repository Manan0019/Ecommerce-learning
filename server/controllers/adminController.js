import pool from "../config/db.js";

export async function getSummary(_req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM products) AS product_count,
         (SELECT COUNT(*)::int FROM products WHERE is_active = TRUE) AS active_product_count,
         (SELECT COUNT(*)::int FROM users WHERE role = 'customer') AS customer_count`
    );
    return res.json({
      summary: {
        productCount: rows[0].product_count,
        activeProductCount: rows[0].active_product_count,
        customerCount: rows[0].customer_count
      }
    });
  } catch (error) {
    console.error("Admin summary error:", error);
    return res.status(500).json({ message: "Could not load dashboard summary." });
  }
}

export async function getCustomers(_req, res) {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, created_at
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
    return res.status(500).json({ message: "Could not load customers." });
  }
}

export function getAdminProfile(req, res) {
  return res.json({
    user: {
      id: String(req.user.id),
      fullName: req.user.full_name,
      email: req.user.email,
      role: req.user.role
    }
  });
}
