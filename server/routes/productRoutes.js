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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "../uploads/products");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 5
  },
  fileFilter(req, file, cb) {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG and WebP images are allowed."));
    }

    cb(null, true);
  }
});

// All routes in this module require an admin.
router.use(requireAdmin);

router.post("/", upload.single("image"), async (req, res) => {
  let savedPath = null;

  try {

    console.log("PRODUCT CREATE ROUTE HIT");

console.log("Product fields:", req.body);

console.log("Image received:", {
  received: Boolean(req.file),
  type: req.file?.mimetype,
  size: req.file?.size
});


    const {
      name,
      description,
      category,
      price,
      stock
    } = req.body;

    const validText = (value, max) =>
      typeof value === "string" &&
      value.trim().length > 0 &&
      value.trim().length <= max;

    if (
      !validText(name, 150) ||
      !validText(description, 5000) ||
      !validText(category, 80)
    ) {
      return res.status(400).json({
        message: "Invalid product name, description or category."
      });
    }

    if (
      typeof price !== "string" ||
      !/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(price) ||
      Number(price) <= 0
    ) {
      return res.status(400).json({
        message: "Enter a valid positive price with up to two decimals."
      });
    }

    if (
      typeof stock !== "string" ||
      !/^(?:0|[1-9]\d*)$/.test(stock) ||
      !Number.isSafeInteger(Number(stock)) ||
      Number(stock) > 2147483647
    ) {
      return res.status(400).json({
        message: "Stock must be a non-negative whole number."
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Product image is required."
      });
    }

    // Decode the actual image and produce a safe, standardized file.
    const imageBuffer = await sharp(req.file.buffer, {
      limitInputPixels: 20_000_000
    })
      .rotate()
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const filename = `${crypto.randomUUID()}.webp`;

    await mkdir(uploadDir, { recursive: true });

    savedPath = path.join(uploadDir, filename);
    await writeFile(savedPath, imageBuffer, { flag: "wx" });

    const imageUrl = `/uploads/products/${filename}`;

    const result = await pool.query(
      `INSERT INTO products
       (name, description, category, price, stock, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, description, category,
                 price, stock, image_url, created_at`,
      [
        name.trim(),
        description.trim(),
        category.trim(),
        price,
        Number(stock),
        imageUrl
      ]
    );

    return res.status(201).json({
      message: "Product created successfully.",
      product: result.rows[0]
    });

  } catch (error) {
    if (savedPath) {
      try {
        await unlink(savedPath);
      } catch (cleanupError) {
        console.error("Image cleanup failed:", cleanupError);
      }
    }

    console.error("Product creation failed:", error);

    return res.status(500).json({
      message: "Could not create product."
    });
  }
});

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      message: error.code === "LIMIT_FILE_SIZE"
        ? "Image must be 5 MB or smaller."
        : "Invalid image upload."
    });
  }

  if (error.message === "Only JPG, PNG and WebP images are allowed.") {
    return res.status(400).json({
      message: error.message
    });
  }

  next(error);
});

export default router;