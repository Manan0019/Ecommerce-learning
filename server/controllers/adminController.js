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

export async function getCustomers(req, res) {
  try {
    // The directory is admin-only. Parameterized substring search prevents SQL wildcard
    // surprises and covers customers older than the first 100 recent accounts.
    const search = String(req.query.q || '').trim().slice(0, 100);
    const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1));
    const pageSize = 10;
    const where = `role = 'customer' AND (
      $1 = '' OR POSITION(LOWER($1) IN LOWER(full_name)) > 0
      OR POSITION(LOWER($1) IN LOWER(email)) > 0
      OR POSITION($1 IN id::text) > 0
    )`;
    const [result, count] = await Promise.all([
      pool.query(`SELECT id, full_name, email, created_at FROM users
        WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3`, [search,pageSize,(page-1)*pageSize]),
      pool.query(`SELECT COUNT(*)::int AS total FROM users WHERE ${where}`, [search])
    ]);
    return res.json({
      total: count.rows[0]?.total || 0,
      page, pageSize, pages:Math.ceil((count.rows[0]?.total||0)/pageSize),
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
