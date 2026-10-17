import pool from "../config/db.js";
function paise(value) {
  const [whole, fraction = ""] = String(value).split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
function rupees(value) {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, "0")}`;
}
export async function quoteCart(req, res) {
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length > 50)
    return res.status(400).json({ message: "Invalid cart size." });
  const seen = new Set();
  for (const item of items) {
    const validId = (x) => typeof x === "string" && /^[1-9]\d*$/.test(x);
    const key = `${item?.productId}:${item?.variantId || ""}`;
    if (
      !item ||
      !validId(item.productId) ||
      (item.variantId != null && !validId(item.variantId)) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99 ||
      seen.has(key)
    )
      return res
        .status(400)
        .json({ message: "Invalid or duplicate cart line." });
    seen.add(key);
  }
  if (!items.length)
    return res.json({ items: [], subtotal: "0.00", valid: true });
  try {
    const productIds = [...new Set(items.map((i) => i.productId))];
    const variantIds = [
      ...new Set(items.map((i) => i.variantId).filter(Boolean)),
    ];
    const { rows: products } = await pool.query(
      `SELECT p.id,p.name,p.price,p.stock,p.image_url,p.is_active,
      c.is_active AS category_active FROM products p JOIN categories c ON c.id=p.category_id
      WHERE p.id=ANY($1::bigint[])`,
      [productIds],
    );
    const { rows: variants } = variantIds.length
      ? await pool.query(
          `SELECT id,product_id,sku,attributes,price,stock,is_active
     FROM product_variants WHERE id=ANY($1::bigint[])`,
          [variantIds],
        )
      : { rows: [] };
    const pm = new Map(products.map((p) => [String(p.id), p]));
    const vm = new Map(variants.map((v) => [String(v.id), v]));
    const { rows: configured } = await pool.query(
      `SELECT DISTINCT product_id FROM product_variants WHERE product_id=ANY($1::bigint[])`,
      [productIds],
    );
    const configuredIds = new Set(configured.map((r) => String(r.product_id)));
    let subtotal = 0n,
      valid = true;
    const quoted = items.map((item) => {
      const product = pm.get(item.productId),
        variant = item.variantId ? vm.get(item.variantId) : null;
      if (
        !product ||
        (item.variantId &&
          (!variant || String(variant.product_id) !== item.productId))
      ) {
        valid = false;
        return {
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantity,
          available: false,
          reason: "Product or variant no longer exists.",
        };
      }
      const requiresVariant = configuredIds.has(item.productId);
      const available = Boolean(
        product.is_active &&
        product.category_active &&
        (!requiresVariant || variant) &&
        (!variant || variant.is_active) &&
        (variant ? variant.stock : product.stock) >= item.quantity,
      );
      if (!available) valid = false;
      const price = variant ? variant.price : product.price,
        stock = variant ? variant.stock : product.stock;
      const line = paise(price) * BigInt(item.quantity);
      subtotal += line;
      return {
        productId: item.productId,
        variantId: item.variantId || null,
        sku: variant?.sku || null,
        attributes: variant?.attributes || {},
        name: product.name,
        imageUrl: product.image_url,
        quantity: item.quantity,
        unitPrice: rupees(paise(price)),
        lineTotal: rupees(line),
        availableStock: stock,
        available,
        reason:
          !product.is_active || !product.category_active
            ? "Product unavailable"
            : requiresVariant && !variant
              ? "Select a product variant"
              : variant && !variant.is_active
                ? "Variant inactive"
                : stock < item.quantity
                  ? "Not enough stock"
                  : null,
      };
    });
    return res.json({ items: quoted, subtotal: rupees(subtotal), valid });
  } catch (error) {
    console.error("Cart quote:", error);
    return res.status(500).json({ message: "Could not calculate cart." });
  }
}
