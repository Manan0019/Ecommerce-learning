import pool from "../config/db.js";

const validId = (value) => typeof value === "string" && /^[1-9]\d*$/.test(value);
const mapVariant = (row) => ({
  id: String(row.id), productId: String(row.product_id), sku: row.sku, customTitle: row.custom_title || "",
  attributes: row.attributes, price: row.price, mrp: row.mrp ?? row.price,
  discountPercent: Number(row.mrp) > 0 ? Number(((Number(row.mrp) - Number(row.price)) / Number(row.mrp) * 100).toFixed(2)) : 0,
  stock: row.stock, isActive: row.is_active
});

export async function listVariants(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
  try {
    const isAdmin = req.baseUrl.startsWith("/api/admin");
    const { rows } = await pool.query(
      `SELECT v.* FROM product_variants v JOIN products p ON p.id=v.product_id
       WHERE v.product_id=$1 ${isAdmin ? "" : "AND v.is_active=TRUE AND p.is_active=TRUE AND EXISTS (SELECT 1 FROM categories c WHERE c.id=p.category_id AND c.is_active=TRUE)"}
       ORDER BY v.id`, [req.params.id]);
    return res.json({ variants: rows.map(mapVariant) });
  } catch (error) { console.error("List variants:", error); return res.status(500).json({ message: "Could not load variants." }); }
}

const money = value => typeof value === "string" && /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(value);
function validate(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const { sku, attributes, price, stock, isActive } = body;
  // Old clients can omit MRP. It then equals selling price for backwards compatibility.
  const mrp = body.mrp ?? price;
  const customTitle = typeof body.customTitle === "string" ? body.customTitle.trim() : "";
  if (customTitle.length > 260 || (body.customTitle != null && typeof body.customTitle !== "string")) return null;
  if (typeof sku !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{1,79}$/.test(sku)) return null;
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes) ||
      Object.keys(attributes).length > 10 || Object.keys(attributes).some(k => !/^[a-z][a-z0-9_]{0,39}$/.test(k) ||
      typeof attributes[k] !== "string" || !attributes[k].trim() || attributes[k].length > 80)) return null;
  if (!money(price) || Number(price) <= 0 || !money(mrp) || Number(mrp) < Number(price)) return null;
  if (!Number.isInteger(stock) || stock < 0 || stock > 2147483647 ||
      (isActive !== undefined && typeof isActive !== "boolean")) return null;
  return { sku: sku.trim(), attributes, price, mrp, stock, customTitle, isActive: isActive !== false };
}
function errorResponse(res,error) {
  if (error.code === "23505") return res.status(409).json({message:"SKU or attribute combination already exists."});
  if (error.code === "23503") return res.status(404).json({message:"Product not found."});
  if (error.code === "23514") return res.status(400).json({message:"MRP cannot be lower than selling price."});
  console.error("Variant operation:",error);
  return res.status(500).json({message:"Variant operation failed."});
}
export async function createVariant(req,res) {
  if (!validId(req.params.id)) return res.status(400).json({message:"Invalid product ID."});
  const data=validate(req.body);
  if (!data) return res.status(400).json({message:"Invalid SKU, options, MRP, selling price or stock."});
  try {
    const {rows}=await pool.query(`INSERT INTO product_variants (product_id,sku,attributes,mrp,price,stock,is_active,custom_title)
      VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.id,data.sku,JSON.stringify(data.attributes),data.mrp,data.price,data.stock,data.isActive,data.customTitle]);
    return res.status(201).json({variant:mapVariant(rows[0])});
  } catch(error) { return errorResponse(res,error); }
}
export async function updateVariant(req,res) {
  if (!validId(req.params.id)||!validId(req.params.variantId)) return res.status(400).json({message:"Invalid ID."});
  const data=validate(req.body);
  if (!data) return res.status(400).json({message:"Invalid variant details."});
  try {
    const {rows}=await pool.query(`UPDATE product_variants SET sku=$1,attributes=$2::jsonb,mrp=$3,price=$4,stock=$5,
       is_active=$6,custom_title=$7,updated_at=NOW() WHERE id=$8 AND product_id=$9 RETURNING *`,
       [data.sku,JSON.stringify(data.attributes),data.mrp,data.price,data.stock,data.isActive,data.customTitle,req.params.variantId,req.params.id]);
    if (!rows.length) return res.status(404).json({message:"Variant not found."});
    return res.json({variant:mapVariant(rows[0])});
  } catch(error) { return errorResponse(res,error); }
}
