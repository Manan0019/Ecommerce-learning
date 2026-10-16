import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import {
  profileImageDiskPath,
  removeProfileImage,
  saveProfileImage
} from "../services/profileImageService.js";

test("profile images are decoded, resized and re-encoded as WebP", async () => {
  const buffer = await sharp({
    create: { width: 20, height: 10, channels: 3, background: "#336699" }
  }).png().toBuffer();
  const saved = await saveProfileImage({ buffer, mimetype: "image/png" });
  try {
    assert.match(saved.url, /^\/uploads\/profiles\/[0-9a-f-]{36}\.webp$/);
    const metadata = await sharp(await readFile(saved.filenameOnDisk)).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 500);
    assert.equal(metadata.height, 500);
    assert.equal(profileImageDiskPath(saved.url), saved.filenameOnDisk);
  } finally {
    await removeProfileImage(saved);
  }
});

test("invalid profile-image contents are rejected", async () => {
  await assert.rejects(
    saveProfileImage({ buffer: Buffer.from("not an image"), mimetype: "image/jpeg" }),
    /INVALID_PROFILE_IMAGE/
  );
});
