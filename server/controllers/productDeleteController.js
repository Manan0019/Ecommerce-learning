import pool from "../config/db.js";

// Permanent deletion is only allowed in the current catalog-only schema.
// Unknown product/variant FKs (e.g. future order_items) fail CLOSED. No file deletion.
export async function deleteProduct(req, res) {
  const { id } = req.params;
  if (!/^[1-9]\d*$/.test(id) || typeof req.body?.confirmName !== "string") {
    return res.status(400).json({ message: "Valid product and confirmation are required." });
  }
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const product = await db.query("SELECT id,name FROM products WHERE id=$1 FOR UPDATE", [id]);
    if (!product.rows.length) { await db.query("ROLLBACK"); return res.status(404).json({message:"Product not found."}); }
    if (product.rows[0].name !== req.body.confirmName) {
      await db.query("ROLLBACK"); return res.status(400).json({message:"Enter the exact product name to confirm permanent deletion."});
    }
    // Promotions may reference this product for placement, or link to its detail page.
    // Fail closed rather than leave published banners with broken destinations.
    const promotions = await db.query(`
      SELECT id FROM promotion_banners
      WHERE product_id=$1 OR link_url=('/products/' || $1::text)
        OR link_url LIKE ('/products/' || $1::text || '?%')
      LIMIT 1 FOR UPDATE`, [id]);
    if (promotions.rows.length) {
      await db.query("ROLLBACK");
      return res.status(409).json({message:"This product is used by a promotion. Edit that promotion and change/remove its product placement or link before deleting this product."});
    }
    const dependencies = await db.query(`
      SELECT conrelid::regclass::text AS referencing_table
      FROM pg_constraint
      WHERE contype='f'
        AND confrelid IN ('products'::regclass,'product_variants'::regclass)
        AND conrelid NOT IN ('product_media'::regclass,'product_variants'::regclass,'customer_wishlist'::regclass,'promotion_banners'::regclass)
      ORDER BY referencing_table`);
    if (dependencies.rows.length) {
      await db.query("ROLLBACK");
      return res.status(409).json({message:`Deletion blocked due to additional dependent tables: ${dependencies.rows.map(r=>r.referencing_table).join(", ")}. Deactivate this product instead.`});
    }
    await db.query("DELETE FROM product_media WHERE product_id=$1", [id]);
    await db.query("DELETE FROM product_variants WHERE product_id=$1", [id]);
    // customer_wishlist rows cascade; records in other related tables must be reviewed above.
    await db.query("DELETE FROM products WHERE id=$1", [id]);
    await db.query("COMMIT");
    return res.json({message:"Product and its SKU/gallery records permanently deleted. Local media files were retained for separate orphan cleanup.",id});
  } catch (error) {
    await db.query("ROLLBACK");
    if (error.code === "23503") return res.status(409).json({message:"This product has dependent records. Deactivate instead."});
    console.error("Delete product:",error);
    return res.status(500).json({message:"Unable to delete product safely."});
  } finally { db.release(); }
}
