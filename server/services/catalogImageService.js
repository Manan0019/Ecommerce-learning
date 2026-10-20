import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import multer from "multer";
import sharp from "sharp";

const directory = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.join(directory, "../uploads");
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_PRODUCT_IMAGE_BYTES = 12 * 1024 * 1024;

export const catalogImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PRODUCT_IMAGE_BYTES, files: 1, fields: 12 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error("UNSUPPORTED_IMAGE"));
    }
    return callback(null, true);
  }
});

// Used only by category routes to allow one large card image and one small menu icon.
export const categoryImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PRODUCT_IMAGE_BYTES, files: 2, fields: 12 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) return callback(new Error("UNSUPPORTED_IMAGE"));
    callback(null, true);
  }
});

export async function saveCatalogImage(file, folder, { required = false, maxSize = 1200 } = {}) {
  if (!file) {
    if (required) throw new Error("IMAGE_REQUIRED");
    return null;
  }
  if (!/^[a-z]+$/.test(folder)) throw new Error("INVALID_UPLOAD_FOLDER");

  let image;
  try {
    image = await sharp(file.buffer, { limitInputPixels: 20_000_000 })
      .rotate()
      .resize(maxSize, maxSize, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new Error("INVALID_IMAGE");
  }

  const uploadDirectory = path.join(uploadsRoot, folder);
  await mkdir(uploadDirectory, { recursive: true });
  const filename = `${crypto.randomUUID()}.webp`;
  const filenameOnDisk = path.join(uploadDirectory, filename);
  await writeFile(filenameOnDisk, image, { flag: "wx" });
  return { filenameOnDisk, url: `/uploads/${folder}/${filename}` };
}

export async function removeCatalogImage(image) {
  const filenameOnDisk = typeof image === "string" ? image : image?.filenameOnDisk;
  if (!filenameOnDisk) return;
  try {
    await unlink(filenameOnDisk);
  } catch (error) {
    if (error.code !== "ENOENT") console.error("Upload cleanup failed:", error);
  }
}

export function handleCatalogImageError(error, _req, res, next) {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      message: error.code === "LIMIT_FILE_SIZE"
        ? "Image must be 12 MB or smaller."
        : "Invalid image upload."
    });
  }
  if (error.message === "UNSUPPORTED_IMAGE") {
    return res.status(400).json({ message: "Only JPG, PNG and WebP are supported." });
  }
  return next(error);
}
