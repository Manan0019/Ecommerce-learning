import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import sharp from "sharp";
import { acceptableSymbolDimensions } from "./brandingRules.js";

const folder = fileURLToPath(new URL("../uploads/branding/", import.meta.url));
const prefix = "/uploads/branding/";
const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const allowedFormats = new Set(["png", "jpeg", "webp"]);
export const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_LOGO_BYTES, files: 1, fields: 0 },
  fileFilter(_req, file, callback) {
    if (!allowedTypes.has(file.mimetype)) return callback(new Error("UNSUPPORTED_LOGO"));
    callback(null, true);
  }
});

export function brandingDiskPath(url) {
  if (typeof url !== "string") return null;
  const match = /^\/uploads\/branding\/([0-9a-f-]{36}\.(?:webp|png))$/.exec(url);
  return match ? path.join(folder, match[1]) : null;
}

export async function processLogoImage(file, purpose = "icon") {
  if (!file?.buffer || !["icon", "favicon"].includes(purpose)) throw new Error("INVALID_LOGO");
  const image = sharp(file.buffer, { limitInputPixels: 12_000_000, failOn: "error" });
  let meta;
  try { meta = await image.metadata(); }
  catch { throw new Error("INVALID_LOGO"); }
  if (!allowedFormats.has(meta.format) || !acceptableSymbolDimensions(meta.width, meta.height)) {
    throw new Error("INVALID_SYMBOL_DIMENSIONS");
  }
  try {
    const pixels = purpose === "favicon" ? 192 : 256;
    const buffer = await image.rotate().resize(pixels, pixels, {
      fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }
    })[purpose === "favicon" ? "png" : "webp"](
      purpose === "favicon" ? { compressionLevel: 9 } : { quality: 92, effort: 4 }
    ).toBuffer();
    await mkdir(folder, { recursive: true });
    const name = `${randomUUID()}.${purpose === "favicon" ? "png" : "webp"}`;
    const fullPath = path.join(folder, name);
    await writeFile(fullPath, buffer, { flag: "wx" });
    return { url: `${prefix}${name}`, fullPath };
  } catch { throw new Error("INVALID_LOGO"); }
}

export async function removeLogoFile(urlOrPath) {
  const filename = urlOrPath?.startsWith?.(prefix) ? brandingDiskPath(urlOrPath) : urlOrPath;
  if (!filename || path.normalize(path.dirname(filename)) !== path.normalize(folder) ||
      !/^[0-9a-f-]{36}\.(?:png|webp)$/.test(path.basename(filename))) return;
  try { await unlink(filename); }
  catch (error) { if (error.code !== "ENOENT") console.error("Brand asset cleanup:", error); }
}

export function handleLogoUploadError(error, _req, res, next) {
  if (error instanceof multer.MulterError) return res.status(400).json({
    message: error.code === "LIMIT_FILE_SIZE" ? "Image must be 5 MB or smaller." : "Invalid brand image upload."
  });
  if (error?.message === "UNSUPPORTED_LOGO") return res.status(400).json({
    message: "Upload a PNG, JPEG or WebP image. SVG uploads are not allowed."
  });
  next(error);
}
