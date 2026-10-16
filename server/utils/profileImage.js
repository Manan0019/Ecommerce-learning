import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import multer from "multer";
import sharp from "sharp";

const directory = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(directory, "../uploads/profiles");
const publicPrefix = "/uploads/profiles/";
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedFormats = new Set(["jpeg", "png", "webp"]);

export const profileImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 6 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error("UNSUPPORTED_PROFILE_IMAGE"));
    }
    return callback(null, true);
  }
});

export async function saveProfileImage(file) {
  if (!file) return null;

  let image;
  try {
    const source = sharp(file.buffer, { limitInputPixels: 16_000_000 });
    const metadata = await source.metadata();
    if (!allowedFormats.has(metadata.format)) {
      throw new Error("INVALID_PROFILE_IMAGE");
    }
    image = await source
      .rotate()
      .resize(500, 500, { fit: "cover", position: "centre" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new Error("INVALID_PROFILE_IMAGE");
  }

  await mkdir(uploadDir, { recursive: true });
  const filename = `${crypto.randomUUID()}.webp`;
  const filenameOnDisk = path.join(uploadDir, filename);
  await writeFile(filenameOnDisk, image, { flag: "wx" });
  return { filenameOnDisk, url: `${publicPrefix}${filename}` };
}

export async function removeProfileImage(image) {
  const filenameOnDisk = typeof image === "string" ? image : image?.filenameOnDisk;
  if (!filenameOnDisk) return;
  try {
    await unlink(filenameOnDisk);
  } catch (error) {
    if (error.code !== "ENOENT") console.error("Profile image cleanup failed:", error);
  }
}

export function profileImageDiskPath(url) {
  if (typeof url !== "string" || !url.startsWith(publicPrefix)) return null;
  const filename = path.basename(url);
  if (!/^[0-9a-f-]{36}\.webp$/.test(filename)) return null;
  return path.join(uploadDir, filename);
}

export function handleProfileImageError(error, _req, res, next) {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      message: error.code === "LIMIT_FILE_SIZE"
        ? "Profile image must be 2 MB or smaller."
        : "Invalid profile image upload."
    });
  }
  if (error.message === "UNSUPPORTED_PROFILE_IMAGE") {
    return res.status(400).json({ message: "Profile image must be JPG, PNG or WebP." });
  }
  return next(error);
}
