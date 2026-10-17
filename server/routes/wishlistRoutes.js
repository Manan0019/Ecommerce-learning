import { Router } from "express";
import pool from "../config/db.js";
import { requireCustomer } from "../middleware/authMiddleware.js";
const router = Router();
router.use(requireCustomer);
router.get("/", async (req, res) => {
 try {
  const { rows } = await pool.query(`SELECT p.id::text AS id, p.name, p.price, p.image_url AS "imageUrl", p.stock,
      c.name AS category, w.created_at AS "savedAt"
    FROM customer_wishlist w JOIN products p ON p.id = w.product_id
    JOIN categories c ON c.id = p.category_id
    WHERE w.user_id = $1 AND p.is_active = TRUE AND c.is_active = TRUE
    ORDER BY w.created_at DESC`, [req.user.id]);
  res.json({ products: rows });
 } catch (error) { console.error("Wishlist list:", error); res.status(500).json({ message: "Wishlist unavailable." }); }
});
router.put("/:id", async (req, res) => {
 if (!/^[1-9]\d*$/.test(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
 try {
  const result = await pool.query(`INSERT INTO customer_wishlist (user_id, product_id)
    SELECT $1, p.id FROM products p JOIN categories c ON c.id = p.category_id
    WHERE p.id = $2 AND p.is_active = TRUE AND c.is_active = TRUE
    ON CONFLICT DO NOTHING RETURNING product_id`, [req.user.id, req.params.id]);
  if (result.rowCount === 0) {
   const exists = await pool.query("SELECT 1 FROM customer_wishlist WHERE user_id=$1 AND product_id=$2", [req.user.id, req.params.id]);
   if (!exists.rowCount) return res.status(404).json({ message: "Product not available." });
  }
  res.json({ saved: true });
 } catch (error) { console.error("Wishlist add:", error); res.status(500).json({ message: "Could not save product." }); }
});
router.delete("/:id", async (req, res) => {
 if (!/^[1-9]\d*$/.test(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
 try { await pool.query("DELETE FROM customer_wishlist WHERE user_id=$1 AND product_id=$2", [req.user.id, req.params.id]); res.json({ saved: false }); }
 catch (error) { console.error("Wishlist remove:", error); res.status(500).json({ message: "Could not remove product." }); }
});
export default router;
