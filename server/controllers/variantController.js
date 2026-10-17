import pool from "../config/db.js";

const validId = (value) =>
  typeof value === "string" && /^[1-9]\d*$/.test(value);
const mapVariant = (row) => ({
  id: String(row.id),
  productId: String(row.product_id),
  sku: row.sku,
  attributes: row.attributes,
  price: row.price,
  stock: row.stock,
  isActive: row.is_active,
});

export async function listVariants(req, res) {
  if (!validId(req.params.id))
    return res.status(400).json({ message: "Invalid product ID." });
  try {
    const { rows } = await pool.query(
      `SELECT v.* FROM product_variants v JOIN products p ON p.id=v.product_id
       WHERE v.product_id=$1 ${req.baseUrl.startsWith("/api/admin") ? "" : "AND v.is_active=TRUE AND p.is_active=TRUE AND EXISTS (SELECT 1 FROM categories c WHERE c.id=p.category_id AND c.is_active=TRUE)"}
       ORDER BY v.id`,
      [req.params.id],
    );
    return res.json({ variants: rows.map(mapVariant) });
  } catch (error) {
    console.error("List variants:", error);
    return res.status(500).json({ message: "Could not load variants." });
  }
}

function validate(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const { sku, attributes, price, stock, isActive } = body;
  if (typeof sku !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{1,79}$/.test(sku))
    return null;
  if (
    !attributes ||
    typeof attributes !== "object" ||
    Array.isArray(attributes) ||
    Object.keys(attributes).length > 10 ||
    Object.keys(attributes).some(
      (k) =>
        !/^[a-z][a-z0-9_]{0,39}$/.test(k) ||
        typeof attributes[k] !== "string" ||
        !attributes[k].trim() ||
        attributes[k].length > 80,
    )
  )
    return null;
  if (
    typeof price !== "string" ||
    !/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(price) ||
    Number(price) <= 0
  )
    return null;
  if (
    !Number.isInteger(stock) ||
    stock < 0 ||
    stock > 2147483647 ||
    (isActive !== undefined && typeof isActive !== "boolean")
  )
    return null;
  return {
    sku: sku.trim(),
    attributes,
    price,
    stock,
    isActive: isActive !== false,
  };
}

function errorResponse(res, error) {
  if (error.code === "23505")
    return res
      .status(409)
      .json({
        message: "SKU or variant attribute combination already exists.",
      });
  if (error.code === "23503")
    return res.status(404).json({ message: "Product not found." });
  console.error("Variant operation:", error);
  return res.status(500).json({ message: "Variant operation failed." });
}

export async function createVariant(req, res) {
  if (!validId(req.params.id))
    return res.status(400).json({ message: "Invalid product ID." });
  const data = validate(req.body);
  if (!data)
    return res
      .status(400)
      .json({
        message: "Invalid variant data. Include SKU, attributes, price, stock.",
      });
  try {
    const { rows } = await pool.query(
      `INSERT INTO product_variants (product_id,sku,attributes,price,stock,is_active)
      VALUES ($1,$2,$3::jsonb,$4,$5,$6) RETURNING *`,
      [
        req.params.id,
        data.sku,
        JSON.stringify(data.attributes),
        data.price,
        data.stock,
        data.isActive,
      ],
    );
    return res.status(201).json({ variant: mapVariant(rows[0]) });
  } catch (error) {
    return errorResponse(res, error);
  }
}
export async function updateVariant(req, res) {
  if (!validId(req.params.id) || !validId(req.params.variantId))
    return res.status(400).json({ message: "Invalid ID." });
  const data = validate(req.body);
  if (!data) return res.status(400).json({ message: "Invalid variant data." });
  try {
    const { rows } = await pool.query(
      `UPDATE product_variants SET sku=$1,attributes=$2::jsonb,price=$3,stock=$4,
       is_active=$5,updated_at=NOW() WHERE id=$6 AND product_id=$7 RETURNING *`,
      [
        data.sku,
        JSON.stringify(data.attributes),
        data.price,
        data.stock,
        data.isActive,
        req.params.variantId,
        req.params.id,
      ],
    );
    if (!rows.length)
      return res.status(404).json({ message: "Variant not found." });
    return res.json({ variant: mapVariant(rows[0]) });
  } catch (error) {
    return errorResponse(res, error);
  }
}
