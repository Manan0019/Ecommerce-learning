import pool from "../config/db.js";
import {withDescendantCounts} from "../services/categoryTree.js";
import {
  createUniqueCategorySlug,
  normalizeCategoryName
} from "../services/categoryService.js";
import { removeCatalogImage, saveCatalogImage } from "../services/catalogImageService.js";
import { getSpecificationDefinition, resolveSpecificationType } from "../config/productSpecifications.js";

function validId(id) {
  return /^[1-9]\d*$/.test(id);
}

function mapCategory(category) {
  return {
    id: String(category.id),
    name: category.name,
    slug: category.slug,
    specificationType: resolveSpecificationType(category),
    imageUrl: category.image_url,
    menuIconUrl: category.menu_icon_url || null,
    parentId: category.parent_id == null ? null : String(category.parent_id),
    parentName: category.parent_name || null,
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
      SELECT category.id, category.name, category.slug, category.image_url, category.menu_icon_url, category.parent_id, parent.name AS parent_name,
             category.is_active, category.created_at, category.updated_at,
             COUNT(product.id)::int AS product_count
      FROM categories AS category
      LEFT JOIN products AS product ON product.category_id = category.id
      LEFT JOIN categories AS parent ON parent.id = category.parent_id
      GROUP BY category.id,parent.id
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
  let savedIcon = null;
  try {
    const parentId = req.body?.parentId || null;
    if (parentId && !validId(parentId)) return res.status(400).json({message:"Invalid parent category."});
    if (parentId) {
      const parent = await pool.query("SELECT id FROM categories WHERE id=$1",[parentId]);
      if (!parent.rows.length) return res.status(400).json({message:"Parent category not found."});
    }
    saved = await saveCatalogImage(req.files?.image?.[0], "categories");
    savedIcon = await saveCatalogImage(req.files?.menuIcon?.[0], "categories", { maxSize: 160 });
    const slug = await createUniqueCategorySlug(pool, name);
    const { rows } = await pool.query(`
      INSERT INTO categories (name, slug, image_url, menu_icon_url, parent_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, slug, image_url, menu_icon_url, parent_id, is_active, created_at, updated_at,
                0::int AS product_count
    `, [name, slug, saved?.url || null, savedIcon?.url || null, parentId]);
    return res.status(201).json({ message: "Category created.", category: mapCategory(rows[0]) });
  } catch (error) {
    await Promise.all([removeCatalogImage(saved), removeCatalogImage(savedIcon)]);
    return categoryError(res, error, "Creating category");
  }
}

export async function updateCategory(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid category ID." });
  const name = normalizeCategoryName(req.body?.name);
  if (!name) return res.status(400).json({ message: "Category name must be 2 to 80 characters." });

  let saved = null;
  let savedIcon = null;
  const client = await pool.connect();
  try {
    const existing = await client.query(
      "SELECT id, name, image_url, menu_icon_url FROM categories WHERE id = $1",
      [req.params.id]
    );
    if (!existing.rows.length) return res.status(404).json({ message: "Category not found." });

    await client.query("BEGIN");
    const parentId = req.body?.parentId || null;
    if (parentId && !validId(parentId)) {await client.query("ROLLBACK"); return res.status(400).json({message:"Invalid parent category."});}
    if (parentId) {
      if (String(parentId) === String(req.params.id)) {await client.query("ROLLBACK"); return res.status(400).json({message:"A category cannot be its own parent."});}
      const cycle = await client.query(`WITH RECURSIVE ancestors AS (
        SELECT id,parent_id FROM categories WHERE id=$1
        UNION ALL SELECT p.id,p.parent_id FROM categories p JOIN ancestors a ON a.parent_id=p.id
      ) SELECT id FROM ancestors`,[parentId]);
      if (!cycle.rows.length || cycle.rows.some(row=>String(row.id)===String(req.params.id))) {
        await client.query("ROLLBACK");return res.status(400).json({message:"Invalid category hierarchy or cycle."});
      }
    }
    saved = await saveCatalogImage(req.files?.image?.[0], "categories");
    savedIcon = await saveCatalogImage(req.files?.menuIcon?.[0], "categories", { maxSize: 160 });
    const slug = await createUniqueCategorySlug(client, name, req.params.id);
    const { rows } = await client.query(`
      WITH updated AS (
        UPDATE categories
        SET name = $1, slug = $2, image_url = COALESCE($3, image_url),
            menu_icon_url = CASE WHEN $6::boolean THEN NULL ELSE COALESCE($7, menu_icon_url) END,
            parent_id=$4, updated_at = NOW()
        WHERE id = $5
        RETURNING *
      )
      SELECT updated.id, updated.name, updated.slug, updated.image_url, updated.parent_id, updated.is_active,
             updated.menu_icon_url, updated.created_at, updated.updated_at,
             (SELECT COUNT(*)::int FROM products WHERE category_id = updated.id) AS product_count
      FROM updated
    `, [name, slug, saved?.url || null, parentId, req.params.id,
      req.body?.removeMenuIcon === "true" && !savedIcon, savedIcon?.url || null]);
    await client.query(
      "UPDATE products SET category = $1, updated_at = NOW() WHERE category_id = $2",
      [name, req.params.id]
    );
    await client.query("COMMIT");
    return res.json({ message: "Category updated.", category: mapCategory(rows[0]) });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* transaction may not have started */ }
    await Promise.all([removeCatalogImage(saved), removeCatalogImage(savedIcon)]);
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
      SELECT updated.id, updated.name, updated.slug, updated.image_url, updated.parent_id, updated.is_active,
             updated.menu_icon_url, updated.created_at, updated.updated_at,
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

/** Delete an empty leaf category only. Do not cascade into products, children or banners.
 * The row lock makes concurrent FK inserts wait until the delete commits. */
export async function deleteCategory(req, res) {
  if (!validId(req.params.id) || typeof req.body?.confirmName !== "string") {
    return res.status(400).json({ message: "Category ID and exact name confirmation are required." });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "SELECT id, name, slug FROM categories WHERE id=$1 FOR UPDATE", [req.params.id]);
    if (!result.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Category not found." });
    }
    const category = result.rows[0];
    if (req.body.confirmName !== category.name) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Enter the exact category name to confirm deletion." });
    }
    const { rows: [usage] } = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM products WHERE category_id=$1) AS products,
        (SELECT COUNT(*)::int FROM categories WHERE parent_id=$1) AS children,
        (SELECT COUNT(*)::int FROM promotion_banners WHERE category_id=$1
           OR link_url=$2 OR link_url LIKE ($2 || '?%')
           OR link_url=('/products?category=' || $3)
           OR link_url LIKE ('/products?category=' || $3 || '&%')) AS promotions
    `, [category.id, `/categories/${category.slug}`, category.slug]);
    const reasons = [];
    if (usage.products) reasons.push(`${usage.products} assigned product(s)`);
    if (usage.children) reasons.push(`${usage.children} child category/subcategories`);
    if (usage.promotions) reasons.push(`${usage.promotions} referring promotion(s)`);
    if (reasons.length) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: `Cannot delete ${category.name}: ${reasons.join(', ')}. Move products, delete child categories, or change promotions first. You can deactivate it instead.`
      });
    }
    await client.query("DELETE FROM categories WHERE id=$1", [category.id]);
    await client.query("COMMIT");
    return res.json({ id: String(category.id), message: `Category ${category.name} permanently deleted. Its uploaded image was retained for later orphan-file cleanup.` });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* already rolled back */ }
    if (error.code === "23503") {
      return res.status(409).json({ message: "Category is referenced by other records. Move or deactivate it instead." });
    }
    console.error("Deleting category:", error);
    return res.status(500).json({ message: "Could not safely delete category." });
  } finally {
    client.release();
  }
}

export async function listPublicCategories(_req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT category.id, category.name, category.slug, category.parent_id, parent.name AS parent_name,
             category.image_url AS image_url, category.menu_icon_url,
             category.is_active, category.created_at, category.updated_at,
             COUNT(product.id)::int AS product_count
      FROM categories AS category
      LEFT JOIN products AS product
        ON product.category_id = category.id AND product.is_active = TRUE
      LEFT JOIN categories AS parent ON parent.id=category.parent_id
      WHERE category.is_active = TRUE
      GROUP BY category.id,parent.id
      ORDER BY category.name ASC, category.id ASC
    `);
    return res.json({ categories: withDescendantCounts(rows.map(mapCategory)) });
  } catch (error) {
    return categoryError(res, error, "Loading categories");
  }
}

export async function getPublicSpecificationDefinition(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid category ID." });
  try {
    const { rows } = await pool.query(
      "SELECT id, name, slug FROM categories WHERE id = $1 AND is_active = TRUE",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Active category not found." });
    return res.json({ definition: getSpecificationDefinition(rows[0]) });
  } catch (error) {
    return categoryError(res, error, "Loading specification definition");
  }
}

export async function getAdminSpecificationDefinition(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid category ID." });
  try {
    const { rows } = await pool.query(
      "SELECT id, name, slug FROM categories WHERE id = $1",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Category not found." });
    return res.json({ definition: getSpecificationDefinition(rows[0]) });
  } catch (error) {
    return categoryError(res, error, "Loading specification definition");
  }
}
