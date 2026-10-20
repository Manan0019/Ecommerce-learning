import pool from "../config/db.js";
import { attachCardPreviews } from "../services/catalogueCardPreviews.js";
import { bestRelatedCover, rankRelatedCandidates } from "../services/relatedProductRules.js";

// Recommendations are drawn from active products in the same category branch,
// or the same brand. They never expose personalized customer information.
export async function listRelatedProducts(req, res) {
  const id = req.params.id;
  if (!/^[1-9]\d*$/.test(id)) return res.status(400).json({ message: "Invalid product ID." });
  try {
    const { rows } = await pool.query(`
      WITH RECURSIVE source AS (
        SELECT p.id, p.category_id, NULLIF(lower(btrim(p.brand)), '') AS brand
        FROM products p JOIN categories c ON c.id=p.category_id
        WHERE p.id=$1 AND p.is_active=TRUE AND c.is_active=TRUE
      ), ancestors AS (
        SELECT c.id, c.parent_id, 0 AS depth FROM categories c
        JOIN source s ON s.category_id=c.id
        UNION ALL
        SELECT parent.id, parent.parent_id, ancestor.depth+1
        FROM ancestors ancestor JOIN categories parent ON parent.id=ancestor.parent_id
        WHERE ancestor.depth < 12 AND parent.is_active=TRUE
      ), relatives AS (
        SELECT id, depth AS distance FROM ancestors
        UNION ALL
        SELECT child.id, rel.distance+1
        FROM relatives rel JOIN categories child ON child.parent_id=rel.id
        WHERE child.is_active=TRUE AND rel.distance<24
      ), category_distance AS (
        SELECT id, MIN(distance)::integer AS distance FROM relatives GROUP BY id
      )
      SELECT p.id::text AS id, p.name, p.description,
             c.name AS category, c.slug AS "categorySlug", p.brand, p.model,
             COALESCE(chosen.price,p.price) AS price,
             COALESCE(chosen.mrp,p.mrp) AS mrp,
             CASE WHEN inventory.has_variants THEN COALESCE(chosen.stock,0) ELSE p.stock END AS stock,
             p.image_url AS "imageUrl", p.created_at AS "createdAt",
             chosen.id::text AS "selectedVariantId",
             chosen.attributes AS "selectedAttributes",
             category_distance.distance AS "categoryDistance",
             (s.brand IS NOT NULL AND lower(btrim(p.brand))=s.brand) AS "brandMatch"
      FROM source s
      JOIN products p ON p.id<>s.id AND p.is_active=TRUE
      JOIN categories c ON c.id=p.category_id AND c.is_active=TRUE
      LEFT JOIN category_distance ON category_distance.id=p.category_id
      LEFT JOIN LATERAL (
        SELECT EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id) AS has_variants
      ) inventory ON TRUE
      LEFT JOIN LATERAL (
        SELECT v.id, v.attributes, v.price, v.mrp, v.stock
        FROM product_variants v
        WHERE v.product_id=p.id AND v.is_active=TRUE
        ORDER BY CASE WHEN v.stock>0 THEN 0 ELSE 1 END, v.price, v.id LIMIT 1
      ) chosen ON TRUE
      WHERE (category_distance.id IS NOT NULL OR
             (s.brand IS NOT NULL AND lower(btrim(p.brand))=s.brand))
        AND (inventory.has_variants=FALSE OR chosen.id IS NOT NULL)
      ORDER BY category_distance.distance ASC NULLS LAST,
               CASE WHEN chosen.stock>0 OR (NOT inventory.has_variants AND p.stock>0) THEN 0 ELSE 1 END,
               p.created_at DESC, p.id DESC
      LIMIT 72
    `, [id]);
    // No source, or no genuinely related products: the UI offers a route back to Shop.
    const selected = rankRelatedCandidates(rows, id, 8);
    if (!selected.length) return res.json({ products: [] });
    const mediaResult = await pool.query(`
      SELECT id, product_id, variant_id, option_key, option_value, media_type,
             media_url, sort_order, is_card_cover
      FROM product_media
      WHERE product_id=ANY($1::bigint[]) AND media_type='image'
      ORDER BY product_id,sort_order,id
    `, [selected.map(item => item.id)]);
    const mediaById = new Map();
    for (const item of mediaResult.rows) {
      const id = String(item.product_id);
      if (!mediaById.has(id)) mediaById.set(id, []);
      mediaById.get(id).push(item);
    }
    const cardRows = selected.map(({ categoryDistance, brandMatch, ...card }) => ({
      ...card,
      imageUrl: bestRelatedCover(card, mediaById.get(String(card.id)) || []),
    }));
    return res.json({ products: attachCardPreviews(cardRows, mediaResult.rows) });
  } catch (error) {
    console.error("Related products:", error);
    return res.status(500).json({ message: "Could not load related products." });
  }
}
