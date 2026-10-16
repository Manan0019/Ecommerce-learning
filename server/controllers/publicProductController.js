import pool from "../config/db.js";

const selectFields = `
  product.id, product.name, product.description, product.category_id,
  category.name AS category_name, category.slug AS category_slug,
  product.price, product.stock, product.image_url, product.created_at`;

function asPublicProduct(product) {
  return {
    id: String(product.id),
    name: product.name,
    description: product.description,
    categoryId: String(product.category_id),
    category: product.category_name,
    categorySlug: product.category_slug,
    price: product.price,
    stock: product.stock,
    imageUrl: product.image_url,
    createdAt: product.created_at
  };
}

export async function listProducts(req, res) {
  const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
  if (category.length > 100) return res.status(400).json({ message: "Invalid category." });
  try {
    const values = category ? [category] : [];
    const categoryFilter = category
      ? "AND (category.slug = $1 OR lower(category.name) = lower($1))"
      : "";
    const { rows } = await pool.query(`
      SELECT ${selectFields}
      FROM products AS product
      JOIN categories AS category ON category.id = product.category_id
      WHERE product.is_active = TRUE AND category.is_active = TRUE
      ${categoryFilter}
      ORDER BY product.created_at DESC, product.id DESC
      LIMIT 100
    `, values);
    return res.json({ products: rows.map(asPublicProduct) });
  } catch (error) {
    console.error("Public product list:", error);
    return res.status(500).json({ message: "Could not load products." });
  }
}

export async function getProduct(req, res) {
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    return res.status(400).json({ message: "Invalid product ID." });
  }
  try {
    const { rows } = await pool.query(`
      SELECT ${selectFields}
      FROM products AS product
      JOIN categories AS category ON category.id = product.category_id
      WHERE product.id = $1 AND product.is_active = TRUE AND category.is_active = TRUE
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Product not found or inactive." });
    return res.json({ product: asPublicProduct(rows[0]) });
  } catch (error) {
    console.error("Public product details:", error);
    return res.status(500).json({ message: "Could not load product." });
  }
}
