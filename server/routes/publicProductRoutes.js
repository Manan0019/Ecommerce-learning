import { Router } from "express";
import pool from "../config/db.js";

const router = Router();
const mapProduct = p => ({
  id: String(p.id), name: p.name, description: p.description,
  category: p.category, price: p.price, stock: p.stock,
  imageUrl: p.image_url, createdAt: p.created_at
});

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, category, price, stock, image_url, created_at
      FROM products WHERE is_active = TRUE
      ORDER BY created_at DESC, id DESC LIMIT 100
    `);
    return res.json({ products: result.rows.map(mapProduct) });
  } catch (error) {
    console.error("Public product list failed:", error);
    return res.status(500).json({ message: "Could not load products." });
  }
});

router.get("/:id", async (req, res) => {
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    return res.status(400).json({ message: "Invalid product ID." });
  }
  try {
    const result = await pool.query(`
      SELECT id, name, description, category, price, stock, image_url, created_at
      FROM products WHERE id=$1 AND is_active=TRUE
    `, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: "Product not found." });
    return res.json({ product: mapProduct(result.rows[0]) });
  } catch (error) {
    console.error("Public product details failed:", error);
    return res.status(500).json({ message: "Could not load product." });
  }
});
export default router;
