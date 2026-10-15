import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import pool from "../config/db.js";
import { requireAdmin } from "../middleware/authMiddleware.js";

const router = Router();
const directory = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(directory, "../uploads/products");
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5 },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      return callback(new Error("UNSUPPORTED_IMAGE"));
    }
    callback(null, true);
  }
});

function validId(id) {
  return /^[1-9]\d*$/.test(id);
}

function checkProductFields(body) {
  const { name, description, category, price, stock } = body;
  const text = (value, max) => typeof value === "string" &&
    value.trim().length > 0 && value.trim().length <= max;
  const validPrice = typeof price === "string" &&
    /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(price) && Number(price) > 0;
  const stockString = typeof stock === "string" ? stock :
    (Number.isInteger(stock) ? String(stock) : "");
  const validStock = /^(?:0|[1-9]\d*)$/.test(stockString) &&
    Number(stockString) <= 2147483647;
  if (!text(name, 150) || !text(description, 5000) || !text(category, 80) ||
      !validPrice || !validStock) return null;
  return [name.trim(), description.trim(), category.trim(), price, Number(stockString)];
}

function mapProduct(p) {
  return {
    id: String(p.id), name: p.name, description: p.description,
    category: p.category, price: p.price, stock: p.stock,
    imageUrl: p.image_url, isActive: p.is_active,
    createdAt: p.created_at, updatedAt: p.updated_at
  };
}

async function saveImage(file) {
  if (!file) {
    const error = new Error("IMAGE_REQUIRED");
    throw error;
  }
  // Decoding and re-encoding means we do not trust the supplied file extension.
  let buffer;
  try {
    buffer = await sharp(file.buffer, { limitInputPixels: 20_000_000 })
      .rotate().resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 }).toBuffer();
  } catch {
    throw new Error("INVALID_IMAGE");
  }
  await mkdir(uploadDir, { recursive: true });
  const filename = `${crypto.randomUUID()}.webp`;
  const filenameOnDisk = path.join(uploadDir, filename);
  await writeFile(filenameOnDisk, buffer, { flag: "wx" });
  return { filenameOnDisk, url: `/uploads/products/${filename}` };
}

async function removeIfPresent(filenameOnDisk) {
  if (!filenameOnDisk) return;
  try { await unlink(filenameOnDisk); }
  catch (error) { console.error("Upload cleanup failed:", error); }
}

function routeError(res, error, context) {
  if (error.message === "IMAGE_REQUIRED") return res.status(400).json({ message: "Product image is required." });
  if (error.message === "INVALID_IMAGE") return res.status(400).json({ message: "The file is not a valid supported image." });
  if (error.code === "23514") return res.status(400).json({ message: "Invalid price or stock." });
  console.error(`${context}:`, error);
  return res.status(500).json({ message: `${context} failed.` });
}

router.use(requireAdmin);

// IMPORTANT: This code expects the Lesson 8 is_active/updated_at migration.
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, category, price, stock, image_url,
             is_active, created_at, updated_at
      FROM products ORDER BY created_at DESC, id DESC LIMIT 100
    `);
    return res.json({ products: result.rows.map(mapProduct) });
  } catch (error) { return routeError(res, error, "Loading products"); }
});

router.get("/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
  try {
    const result = await pool.query(`
      SELECT id, name, description, category, price, stock, image_url,
             is_active, created_at, updated_at FROM products WHERE id = $1
    `, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: "Product not found." });
    return res.json({ product: mapProduct(result.rows[0]) });
  } catch (error) { return routeError(res, error, "Loading product"); }
});

router.post("/", upload.single("image"), async (req, res) => {
  const fields = checkProductFields(req.body ?? {});
  if (!fields) return res.status(400).json({ message: "Invalid name, description, category, price or stock." });
  let saved = null;
  try {
    saved = await saveImage(req.file);
    const result = await pool.query(`
      INSERT INTO products (name, description, category, price, stock, image_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, description, category, price, stock, image_url,
                is_active, created_at, updated_at
    `, [...fields, saved.url]);
    return res.status(201).json({ message: "Product created successfully.", product: mapProduct(result.rows[0]) });
  } catch (error) {
    await removeIfPresent(saved?.filenameOnDisk);
    return routeError(res, error, "Creating product");
  }
});

router.put("/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
  const fields = checkProductFields(req.body ?? {});
  if (!fields) return res.status(400).json({ message: "Invalid product details." });
  try {
    const result = await pool.query(`
      UPDATE products SET name=$1, description=$2, category=$3, price=$4,
                          stock=$5, updated_at=NOW() WHERE id=$6
      RETURNING id, name, description, category, price, stock, image_url,
                is_active, created_at, updated_at
    `, [...fields, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: "Product not found." });
    return res.json({ message: "Product updated successfully.", product: mapProduct(result.rows[0]) });
  } catch (error) { return routeError(res, error, "Updating product"); }
});

router.patch("/:id/status", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
  if (typeof req.body?.isActive !== "boolean") {
    return res.status(400).json({ message: "isActive must be true or false." });
  }
  try {
    const result = await pool.query(`
      UPDATE products SET is_active=$1, updated_at=NOW() WHERE id=$2
      RETURNING id, name, is_active
    `, [req.body.isActive, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: "Product not found." });
    return res.json({ message: req.body.isActive ? "Product activated." : "Product deactivated.",
      product: { id: String(result.rows[0].id), name: result.rows[0].name, isActive: result.rows[0].is_active } });
  } catch (error) { return routeError(res, error, "Updating product status"); }
});

router.put("/:id/image", upload.single("image"), async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
  let saved = null;
  let committed = false;
  try {
    const existing = await pool.query("SELECT id FROM products WHERE id=$1", [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ message: "Product not found." });
    saved = await saveImage(req.file);
    const result = await pool.query(`
      UPDATE products SET image_url=$1, updated_at=NOW() WHERE id=$2
      RETURNING image_url
    `, [saved.url, req.params.id]);
    if (!result.rows.length) {
      await removeIfPresent(saved.filenameOnDisk);
      saved = null;
      return res.status(404).json({ message: "Product not found." });
    }
    committed = true;
    // Keep the old file: it may be referenced by caches; cleanup is a separate concern.
    return res.json({ message: "Image updated successfully.", imageUrl: result.rows[0].image_url });
  } catch (error) {
    if (!committed) await removeIfPresent(saved?.filenameOnDisk);
    return routeError(res, error, "Replacing product image");
  }
});

// Multer errors happen before the route handler's try/catch.
router.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ message: error.code === "LIMIT_FILE_SIZE"
      ? "Image must be 5 MB or smaller." : "Invalid image upload." });
  }
  if (error.message === "UNSUPPORTED_IMAGE") {
    return res.status(400).json({ message: "Only JPG, PNG and WebP are supported." });
  }
  return next(error);
});

export default router;
