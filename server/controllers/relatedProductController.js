import pool from "../config/db.js";

// Recommendations use existing, active catalogue data only.
// Same-category products rank first; same-brand products provide fallbacks.
export async function listRelatedProducts(req, res) {
  const id = req.params.id;
  if (!/^[1-9]\d*$/.test(id)) {
    return res.status(400).json({ message: "Invalid product ID." });
  }
  try {
    const { rows } = await pool.query(
      `
      WITH source AS (
        SELECT p.id, p.category_id, NULLIF(lower(trim(p.brand)), '') AS brand
        FROM products p
        JOIN categories c ON c.id = p.category_id
        WHERE p.id = $1 AND p.is_active = TRUE AND c.is_active = TRUE
      )
      SELECT p.id::text AS id, p.name, p.description,
             c.name AS category, c.slug AS "categorySlug",
             p.brand, p.model, p.price, p.stock, p.image_url AS "imageUrl",
             CASE WHEN p.category_id = s.category_id THEN 0 ELSE 1 END AS rank
      FROM source s
      JOIN products p ON p.id <> s.id AND p.is_active = TRUE
      JOIN categories c ON c.id = p.category_id AND c.is_active = TRUE
      WHERE p.category_id = s.category_id
         OR (s.brand IS NOT NULL AND lower(trim(p.brand)) = s.brand)
      ORDER BY rank, p.created_at DESC, p.id DESC
      LIMIT 8
    `,
      [id],
    );
    return res.json({ products: rows.map(({ rank, ...product }) => product) });
  } catch (error) {
    console.error("Related products:", error);
    return res
      .status(500)
      .json({ message: "Could not load related products." });
  }
}
