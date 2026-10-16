import pool from "../config/db.js";
import {
  createUniqueCategorySlug,
  normalizeCategoryName
} from "../services/categoryService.js";
import { removeCatalogImage, saveCatalogImage } from "../services/catalogImageService.js";

function validId(id) {
  return /^[1-9]\d*$/.test(id);
}

function mapCategory(category) {
  return {
    id: String(category.id),
    name: category.name,
    slug: category.slug,
    imageUrl: category.image_url,
    isActive: category.is_active,
    productCount: Number(category.product_count || 0),
    createdAt: category.created_at,
    updatedAt: category.updated_at
  };
}

function categoryError(res, error, context) {
  if (error.message === "INVALID_IMAGE") {
    return res.status(400).json({ message: "The file is not a valid supported image." });
  }
  if (error.code === "23505") {
    return res.status(409).json({ message: "A category with that name already exists." });
  }
  console.error(`${context}:`, error);
  return res.status(500).json({ message: `${context} failed.` });
}

export async function listAdminCategories(_req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT category.id, category.name, category.slug, category.image_url,
             category.is_active, category.created_at, category.updated_at,
             COUNT(product.id)::int AS product_count
      FROM categories AS category
      LEFT JOIN products AS product ON product.category_id = category.id
      GROUP BY category.id
      ORDER BY category.name ASC, category.id ASC
    `);
    return res.json({ categories: rows.map(mapCategory) });
  } catch (error) {
    return categoryError(res, error, "Loading categories");
  }
}

export async function createCategory(req, res) {
  const name = normalizeCategoryName(req.body?.name);
  if (!name) return res.status(400).json({ message: "Category name must be 2 to 80 characters." });

  let saved = null;
  try {
    saved = await saveCatalogImage(req.file, "categories");
    const slug = await createUniqueCategorySlug(pool, name);
    const { rows } = await pool.query(`
      INSERT INTO categories (name, slug, image_url)
      VALUES ($1, $2, $3)
      RETURNING id, name, slug, image_url, is_active, created_at, updated_at,
                0::int AS product_count
    `, [name, slug, saved?.url || null]);
    return res.status(201).json({ message: "Category created.", category: mapCategory(rows[0]) });
  } catch (error) {
    await removeCatalogImage(saved);
    return categoryError(res, error, "Creating category");
  }
}

export async function updateCategory(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid category ID." });
  const name = normalizeCategoryName(req.body?.name);
  if (!name) return res.status(400).json({ message: "Category name must be 2 to 80 characters." });

  let saved = null;
  const client = await pool.connect();
  try {
    const existing = await client.query(
      "SELECT id, name, image_url FROM categories WHERE id = $1",
      [req.params.id]
    );
    if (!existing.rows.length) return res.status(404).json({ message: "Category not found." });

    saved = await saveCatalogImage(req.file, "categories");
    await client.query("BEGIN");
    const slug = await createUniqueCategorySlug(client, name, req.params.id);
    const { rows } = await client.query(`
      WITH updated AS (
        UPDATE categories
        SET name = $1, slug = $2, image_url = COALESCE($3, image_url), updated_at = NOW()
        WHERE id = $4
        RETURNING *
      )
      SELECT updated.id, updated.name, updated.slug, updated.image_url, updated.is_active,
             updated.created_at, updated.updated_at,
             (SELECT COUNT(*)::int FROM products WHERE category_id = updated.id) AS product_count
      FROM updated
    `, [name, slug, saved?.url || null, req.params.id]);
    await client.query(
      "UPDATE products SET category = $1, updated_at = NOW() WHERE category_id = $2",
      [name, req.params.id]
    );
    await client.query("COMMIT");
    return res.json({ message: "Category updated.", category: mapCategory(rows[0]) });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* transaction may not have started */ }
    await removeCatalogImage(saved);
    return categoryError(res, error, "Updating category");
  } finally {
    client.release();
  }
}

export async function updateCategoryStatus(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid category ID." });
  if (typeof req.body?.isActive !== "boolean") {
    return res.status(400).json({ message: "isActive must be true or false." });
  }
  try {
    const { rows } = await pool.query(`
      WITH updated AS (
        UPDATE categories SET is_active = $1, updated_at = NOW() WHERE id = $2
        RETURNING *
      )
      SELECT updated.id, updated.name, updated.slug, updated.image_url, updated.is_active,
             updated.created_at, updated.updated_at,
             (SELECT COUNT(*)::int FROM products WHERE category_id = updated.id) AS product_count
      FROM updated
    `, [req.body.isActive, req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Category not found." });
    return res.json({
      message: req.body.isActive ? "Category activated." : "Category deactivated.",
      category: mapCategory(rows[0])
    });
  } catch (error) {
    return categoryError(res, error, "Updating category status");
  }
}

export async function listPublicCategories(_req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT category.id, category.name, category.slug,
             COALESCE(category.image_url, MIN(product.image_url)) AS image_url,
             category.is_active, category.created_at, category.updated_at,
             COUNT(product.id)::int AS product_count
      FROM categories AS category
      LEFT JOIN products AS product
        ON product.category_id = category.id AND product.is_active = TRUE
      WHERE category.is_active = TRUE
      GROUP BY category.id
      ORDER BY category.name ASC, category.id ASC
    `);
    return res.json({ categories: rows.map(mapCategory) });
  } catch (error) {
    return categoryError(res, error, "Loading categories");
  }
}
