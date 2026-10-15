import { Router } from "express";
import pool from "../config/db.js";
const router = Router();

function toPaise(value) {
  const [rupees, fractional = ""] = String(value).split(".");
  return BigInt(rupees) * 100n + BigInt(fractional.padEnd(2, "0"));
}
function money(paise) {
  return `${paise / 100n}.${(paise % 100n).toString().padStart(2, "0")}`;
}
router.post("/quote", async (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length > 50) {
    return res.status(400).json({ message: "Cart must be an array with at most 50 items." });
  }
  const seen = new Set();
  for (const item of items) {
    if (!item || typeof item.productId !== "string" ||
        !/^[1-9]\d*$/.test(item.productId) ||
        !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99 ||
        seen.has(item.productId)) {
      return res.status(400).json({ message: "Invalid product ID, duplicate ID or quantity." });
    }
    seen.add(item.productId);
  }
  if (items.length === 0) return res.json({ items: [], subtotal: "0.00", valid: true });
  try {
    const { rows } = await pool.query(
      `SELECT id, name, price, stock, is_active, image_url FROM products
       WHERE id = ANY($1::bigint[])`, [items.map(i => i.productId)]
    );
    const products = new Map(rows.map(row => [String(row.id), row]));
    let subtotal = 0n;
    let valid = true;
    const quoted = items.map(item => {
      const product = products.get(item.productId);
      if (!product) {
        valid = false;
        return { productId: item.productId, quantity: item.quantity, available: false, reason: "Product not found." };
      }
      const available = product.is_active && product.stock >= item.quantity;
      if (!available) valid = false;
      const unit = toPaise(product.price);
      const line = unit * BigInt(item.quantity);
      subtotal += line;
      return {
        productId: String(product.id), name: product.name, imageUrl: product.image_url,
        quantity: item.quantity, unitPrice: money(unit), lineTotal: money(line),
        availableStock: product.stock, available,
        reason: !product.is_active ? "Product inactive." :
          product.stock < item.quantity ? "Not enough stock." : null
      };
    });
    return res.json({ items: quoted, subtotal: money(subtotal), valid });
  } catch (error) {
    console.error("Cart quote:", error);
    return res.status(500).json({ message: "Unable to calculate cart." });
  }
});
export default router;
