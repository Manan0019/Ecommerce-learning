import pool from "../config/db.js";

const selectFields = "id, name, description, category, price, stock, image_url, created_at";

function asPublicProduct(product) {
  return {
    id: String(product.id),
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price,
    stock: product.stock,
    imageUrl: product.image_url,
    createdAt: product.created_at
  };
}

export async function listProducts(_req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT ${selectFields} FROM products WHERE is_active = TRUE
       ORDER BY created_at DESC, id DESC LIMIT 100`
    );
    return res.json({ products: rows.map(asPublicProduct) });
  } catch (error) {
    console.error("Public product list:", error);
    return res.status(500).json({ message: "Could not load products. Check the server console and Lesson 8 migration." });
  }
}

export async function getProduct(req, res) {
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    return res.status(400).json({ message: "Invalid product ID." });
  }
  try {
    const { rows } = await pool.query(
      `SELECT ${selectFields} FROM products WHERE id = $1 AND is_active = TRUE`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Product not found or inactive." });
    return res.json({ product: asPublicProduct(rows[0]) });
  } catch (error) {
    console.error("Public product details:", error);
    return res.status(500).json({ message: "Could not load product." });
  }
}
