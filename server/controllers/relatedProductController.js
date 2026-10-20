import pool from "../config/db.js";
import { attachCardPreviews } from "../services/catalogueCardPreviews.js";

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
             p.brand, p.model, pricing.price, pricing.mrp, pricing.stock,
             p.image_url AS "imageUrl",
             CASE WHEN p.category_id = s.category_id THEN 0 ELSE 1 END AS rank
      FROM source s
      JOIN products p ON p.id <> s.id AND p.is_active = TRUE
      JOIN categories c ON c.id = p.category_id AND c.is_active = TRUE
      LEFT JOIN LATERAL (
        SELECT
          COALESCE((SELECT v.price FROM product_variants v
            WHERE v.product_id=p.id AND v.is_active
            ORDER BY CASE WHEN v.stock>0 THEN 0 ELSE 1 END, v.price, v.id LIMIT 1), p.price) AS price,
          COALESCE((SELECT v.mrp FROM product_variants v
            WHERE v.product_id=p.id AND v.is_active
            ORDER BY CASE WHEN v.stock>0 THEN 0 ELSE 1 END, v.price, v.id LIMIT 1), p.mrp) AS mrp,
          CASE WHEN EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id)
            THEN COALESCE((SELECT SUM(v.stock)::integer FROM product_variants v
              WHERE v.product_id=p.id AND v.is_active), 0)
            ELSE p.stock END AS stock
      ) pricing ON TRUE
      WHERE p.category_id = s.category_id
         OR (s.brand IS NOT NULL AND lower(trim(p.brand)) = s.brand)
      ORDER BY rank, p.created_at DESC, p.id DESC
      LIMIT 8
    `,
      [id],
    );
    const images = rows.length ? await pool.query(`
      SELECT id,product_id,variant_id,option_key,option_value,media_type,media_url,sort_order
      FROM product_media WHERE product_id = ANY($1::bigint[]) AND media_type='image'
      ORDER BY product_id,sort_order,id
    `, [rows.map(row => row.id)]) : { rows: [] };
    return res.json({ products: attachCardPreviews(rows.map(({ rank, ...product }) => product), images.rows) });
  } catch (error) {
    console.error("Related products:", error);
    return res
      .status(500)
      .json({ message: "Could not load related products." });
  }
}
