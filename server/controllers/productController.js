import pool from "../config/db.js";
import { removeCatalogImage, saveCatalogImage } from "../services/catalogImageService.js";
import { getSpecificationDefinition } from "../config/productSpecifications.js";
import { validateSpecifications } from "../services/productSpecificationService.js";

function validId(id) {
  return /^[1-9]\d*$/.test(id);
}

function checkProductFields(body) {
  const { name, description, categoryId, price, stock, brand, model } = body;
  const mrp = body.mrp === undefined ? price : body.mrp;
  const text = (value, max) => typeof value === "string" &&
    value.trim().length > 0 && value.trim().length <= max;
  const validPrice = typeof price === "string" &&
    /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(price) && Number(price) > 0;
  const stockString = typeof stock === "string" ? stock :
    (Number.isInteger(stock) ? String(stock) : "");
  const validStock = /^(?:0|[1-9]\d*)$/.test(stockString) &&
    Number(stockString) <= 2147483647;

  if (!text(name, 150) || !text(description, 5000) || !validId(String(categoryId || "")) ||
      !validPrice || !validStock || typeof mrp !== "string" ||
      !/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(mrp) || Number(mrp) < Number(price)) return null;
  if (brand !== undefined && brand !== "" && !text(brand, 80)) return null;
  if (model !== undefined && model !== "" && !text(model, 120)) return null;
  return {
    name: name.trim(),
    description: description.trim(),
    categoryId: String(categoryId),
    price,
    mrp,
    stock: Number(stockString),
    brand: typeof brand === "string" && brand.trim() ? brand.trim() : null,
    model: typeof model === "string" && model.trim() ? model.trim() : null
  };
}

function mapProduct(product) {
  return {
    id: String(product.id),
    name: product.name,
    description: product.description,
    categoryId: String(product.category_id),
    category: product.category_name,
    categorySlug: product.category_slug,
    categoryActive: product.category_active,
    brand: product.brand,
    model: product.model,
    specifications: product.specifications || {},
    price: product.price,
    mrp: product.mrp,
    stock: product.stock,
    imageUrl: product.image_url,
    isActive: product.is_active,
    hasVariants: Boolean(product.has_variants),
    displayPrice: product.display_price ?? product.price,
    displayStock: product.display_stock ?? product.stock,
    isFeatured: product.is_featured,
    featuredPosition: product.featured_position,
    createdAt: product.created_at,
    updatedAt: product.updated_at
  };
}

const productSelect = `
  SELECT p.id, p.name, p.description, p.category_id, c.name AS category_name,
         c.slug AS category_slug, c.is_active AS category_active, p.brand, p.model,
         p.specifications, p.price, p.mrp, p.stock,
         p.image_url, p.is_active, p.is_featured, p.featured_position, p.created_at, p.updated_at
  FROM products p
  JOIN categories c ON c.id = p.category_id`;

function routeError(res, error, context) {
  if (error.message === "IMAGE_REQUIRED") return res.status(400).json({ message: "Product image is required." });
  if (error.message === "INVALID_IMAGE") return res.status(400).json({ message: "The file is not a valid supported image." });
  if (error.message === "INVALID_SPECIFICATIONS") return res.status(400).json({ message: "Specifications do not match the selected category." });
  if (error.code === "23514") return res.status(400).json({ message: "Invalid product details." });
  console.error(`${context}:`, error);
  return res.status(500).json({ message: `${context} failed.` });
}

export async function listAdminProducts(_req, res) {
  try {
    const result = await pool.query(`
      SELECT base.*,
        EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id=base.id) AS has_variants,
        COALESCE((SELECT v.price FROM product_variants v WHERE v.product_id=base.id AND v.is_active
          ORDER BY CASE WHEN v.stock>0 THEN 0 ELSE 1 END, v.price, v.id LIMIT 1), base.price) AS display_price,
        CASE WHEN EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id=base.id) THEN
          COALESCE((SELECT SUM(v.stock)::integer FROM product_variants v WHERE v.product_id=base.id AND v.is_active),0)
          ELSE base.stock END AS display_stock
      FROM (${productSelect}) base
      ORDER BY base.created_at DESC, base.id DESC LIMIT 100`);
    return res.json({ products: result.rows.map(mapProduct) });
  } catch (error) {
    return routeError(res, error, "Loading products");
  }
}

export async function getAdminProduct(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
  try {
    const result = await pool.query(`${productSelect} WHERE p.id = $1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: "Product not found." });
    const product = mapProduct(result.rows[0]);
    return res.json({
      product,
      specificationDefinition: getSpecificationDefinition({ name: product.category, slug: product.categorySlug })
    });
  } catch (error) {
    return routeError(res, error, "Loading product");
  }
}

export async function createProduct(req, res) {
  const fields = checkProductFields(req.body ?? {});
  if (!fields) return res.status(400).json({ message: "Invalid name, description, category, price or stock." });
  let saved = null;
  try {
    const categoryResult = await pool.query(
      "SELECT id, name, slug FROM categories WHERE id = $1 AND is_active = TRUE",
      [fields.categoryId]
    );
    if (!categoryResult.rows.length) return res.status(400).json({ message: "Select an active category." });
    const { specifications } = validateSpecifications(categoryResult.rows[0], req.body?.specifications);
    saved = await saveCatalogImage(req.file, "products", { required: true });
    const result = await pool.query(`
      WITH inserted AS (
        INSERT INTO products (
          name, description, category, category_id, brand, model, specifications,
          price, mrp, stock, image_url
        )
        SELECT $1, $2, category.name, category.id, $4, $5, $6::jsonb, $7, $10, $8, $9
        FROM categories AS category
        WHERE category.id = $3 AND category.is_active = TRUE
        RETURNING *
      ), cover AS (
        INSERT INTO product_media (product_id,media_type,media_url,sort_order)
        SELECT id,'image',image_url,0 FROM inserted RETURNING product_id
      )
      SELECT inserted.id, inserted.name, inserted.description, inserted.category_id,
             category.name AS category_name, category.slug AS category_slug,
             category.is_active AS category_active, inserted.brand, inserted.model,
             inserted.specifications, inserted.price, inserted.mrp, inserted.stock,
             inserted.image_url, inserted.is_active, inserted.is_featured, inserted.featured_position, inserted.created_at, inserted.updated_at
      FROM inserted
      JOIN categories AS category ON category.id = inserted.category_id
      JOIN cover ON cover.product_id = inserted.id
    `, [fields.name, fields.description, fields.categoryId, fields.brand, fields.model,
      JSON.stringify(specifications), fields.price, fields.stock, saved.url, fields.mrp]);
    if (!result.rows.length) {
      await removeCatalogImage(saved);
      saved = null;
      return res.status(400).json({ message: "Select an active category." });
    }
    return res.status(201).json({ message: "Product created successfully.", product: mapProduct(result.rows[0]) });
  } catch (error) {
    await removeCatalogImage(saved);
    return routeError(res, error, "Creating product");
  }
}

export async function updateProduct(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
  const fields = checkProductFields(req.body ?? {});
  if (!fields) return res.status(400).json({ message: "Invalid product details." });
  try {
    const categoryResult = await pool.query(
      "SELECT id, name, slug FROM categories WHERE id = $1 AND is_active = TRUE",
      [fields.categoryId]
    );
    if (!categoryResult.rows.length) return res.status(400).json({ message: "Select an active category." });
    const { specifications } = validateSpecifications(categoryResult.rows[0], req.body?.specifications);
    const result = await pool.query(`
      WITH updated AS (
        UPDATE products AS product
        SET name = $1, description = $2, category = category.name, category_id = category.id,
            brand = $4, model = $5, specifications = $6::jsonb,
            price = $7, mrp = $10, stock = $8, updated_at = NOW()
        FROM categories AS category
        WHERE product.id = $9 AND category.id = $3 AND category.is_active = TRUE
        RETURNING product.*
      )
      SELECT updated.id, updated.name, updated.description, updated.category_id,
             category.name AS category_name, category.slug AS category_slug,
             category.is_active AS category_active, updated.brand, updated.model,
             updated.specifications, updated.price, updated.mrp, updated.stock,
             updated.image_url, updated.is_active, updated.is_featured, updated.featured_position, updated.created_at, updated.updated_at
      FROM updated
      JOIN categories AS category ON category.id = updated.category_id
    `, [fields.name, fields.description, fields.categoryId, fields.brand, fields.model,
      JSON.stringify(specifications), fields.price, fields.stock, req.params.id, fields.mrp]);
    if (!result.rows.length) {
      const existing = await pool.query("SELECT id FROM products WHERE id = $1", [req.params.id]);
      if (!existing.rows.length) return res.status(404).json({ message: "Product not found." });
      return res.status(400).json({ message: "Select an active category." });
    }
    return res.json({ message: "Product updated successfully.", product: mapProduct(result.rows[0]) });
  } catch (error) {
    return routeError(res, error, "Updating product");
  }
}

export async function updateProductStatus(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
  if (typeof req.body?.isActive !== "boolean") {
    return res.status(400).json({ message: "isActive must be true or false." });
  }
  try {
    const result = await pool.query(`
      UPDATE products SET is_active = $1, updated_at = NOW() WHERE id = $2
      RETURNING id, name, is_active
    `, [req.body.isActive, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: "Product not found." });
    return res.json({
      message: req.body.isActive ? "Product activated." : "Product deactivated.",
      product: {
        id: String(result.rows[0].id),
        name: result.rows[0].name,
        isActive: result.rows[0].is_active
      }
    });
  } catch (error) {
    return routeError(res, error, "Updating product status");
  }
}

export async function updateProductImage(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
  let saved = null;
  let committed = false;
  try {
    const existing = await pool.query("SELECT id FROM products WHERE id = $1", [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ message: "Product not found." });
    saved = await saveCatalogImage(req.file, "products", { required: true });
    const result = await pool.query(`
      UPDATE products SET image_url = $1, updated_at = NOW() WHERE id = $2
      RETURNING image_url
    `, [saved.url, req.params.id]);
    if (!result.rows.length) {
      await removeCatalogImage(saved);
      saved = null;
      return res.status(404).json({ message: "Product not found." });
    }
    committed = true;
    return res.json({ message: "Image updated successfully.", imageUrl: result.rows[0].image_url });
  } catch (error) {
    if (!committed) await removeCatalogImage(saved);
    return routeError(res, error, "Replacing product image");
  }
}
