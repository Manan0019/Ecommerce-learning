import pool from "../config/db.js";
import { fromPaise, summarizeCart, toPaise, validateCartItems } from "../services/cartPricing.js";

// A quote is read-only. No stock reservation, order or payment is created here.
export async function quoteCart(req, res) {
  const items = req.body?.items;
  const invalid = validateCartItems(items);
  if (invalid) return res.status(400).json({ message: invalid });
  if (items.length === 0) return res.json({ items: [], subtotal: "0.00", availableSubtotal: "0.00", unavailableCount: 0, valid: true });

  try {
    const productIds = [...new Set(items.map(i => i.productId))];
    const variantIds = [...new Set(items.map(i => i.variantId).filter(Boolean))];
    const [productResult, variantResult, configuredResult] = await Promise.all([
      pool.query(`SELECT p.id, p.name, p.price, p.stock, p.image_url, p.is_active,
        c.is_active AS category_active
        FROM products p JOIN categories c ON c.id = p.category_id
        WHERE p.id = ANY($1::bigint[])`, [productIds]),
      variantIds.length
        ? pool.query(`SELECT id, product_id, sku, attributes, price, stock, is_active
            FROM product_variants WHERE id = ANY($1::bigint[])`, [variantIds])
        : Promise.resolve({ rows: [] }),
      pool.query(`SELECT DISTINCT product_id FROM product_variants
        WHERE product_id = ANY($1::bigint[])`, [productIds]),
    ]);
    const products = new Map(productResult.rows.map(p => [String(p.id), p]));
    const variants = new Map(variantResult.rows.map(v => [String(v.id), v]));
    const configured = new Set(configuredResult.rows.map(v => String(v.product_id)));

    const lines = items.map(item => {
      const base = { productId: item.productId, variantId: item.variantId ?? null, quantity: item.quantity };
      const product = products.get(item.productId);
      const variant = item.variantId ? variants.get(item.variantId) : null;
      if (!product) return { ...base, available: false, reason: "Product no longer exists." };
      if (item.variantId && (!variant || String(variant.product_id) !== item.productId)) {
        return { ...base, name: product.name, imageUrl: product.image_url, available: false,
          reason: "Selected variant no longer exists for this product." };
      }
      const requiresVariant = configured.has(item.productId);
      const price = variant ? variant.price : product.price;
      const stock = Number(variant ? variant.stock : product.stock);
      const pricePaise = toPaise(price);
      let reason = null;
      if (!product.is_active || !product.category_active) reason = "Product is inactive.";
      else if (requiresVariant && !variant) reason = "Choose a valid SKU again from the product page.";
      else if (variant && !variant.is_active) reason = "Selected SKU is inactive.";
      else if (!Number.isSafeInteger(stock) || stock < item.quantity) reason = "Insufficient stock.";

      return {
        ...base, name: product.name, imageUrl: product.image_url,
        sku: variant?.sku ?? null, attributes: variant?.attributes ?? {},
        unitPrice: fromPaise(pricePaise),
        lineTotal: fromPaise(pricePaise * BigInt(item.quantity)),
        availableStock: stock, available: !reason, reason,
      };
    });
    return res.json({ items: lines, ...summarizeCart(lines) });
  } catch (error) {
    console.error("Cart quote:", error);
    return res.status(500).json({ message: "Could not calculate cart." });
  }
}
