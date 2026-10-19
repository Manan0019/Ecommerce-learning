import pool from "../config/db.js";
import { processLogoImage, removeLogoFile } from "../services/brandingImageService.js";
import { resolveFaviconUrl } from "../services/brandingRules.js";

const columnByPurpose = { icon: "icon_url", favicon: "favicon_url" };

export async function getBranding(_req, res) {
  try {
    const { rows } = await pool.query(
      "SELECT icon_url, favicon_url, updated_at FROM store_branding WHERE id = 1"
    );
    const iconUrl = rows[0]?.icon_url ?? null;
    const faviconOverrideUrl = rows[0]?.favicon_url ?? null;
    res.set("Cache-Control", "no-store");
    return res.json({
      iconUrl, logoUrl: iconUrl, // logoUrl compatibility for older frontend bundles
      faviconUrl: resolveFaviconUrl(iconUrl, faviconOverrideUrl),
      faviconOverrideUrl, updatedAt: rows[0]?.updated_at ?? null
    });
  } catch (error) {
    console.error("Read branding:", error);
    return res.status(503).json({ message: "Branding unavailable. Apply migrations 018 and 019." });
  }
}

async function writeAsset(req, res, purpose) {
  if (!req.file) return res.status(400).json({ message: "Select an image first." });
  let saved;
  try { saved = await processLogoImage(req.file, purpose); }
  catch (error) {
    return res.status(400).json({ message: error.message === "INVALID_SYMBOL_DIMENSIONS"
      ? "Upload a symbol/icon (at least 32 px each side, roughly square). Do not upload a wide logo with Nexora text."
      : "Image could not be decoded. Use a real PNG, JPEG or WebP under 5 MB." });
  }
  const client = await pool.connect().catch(() => null);
  if (!client) { await removeLogoFile(saved.fullPath); return res.status(503).json({ message: "Database unavailable." }); }
  const column = columnByPurpose[purpose]; // Never read column identifiers from the HTTP request.
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT icon_url, favicon_url FROM store_branding WHERE id=1 FOR UPDATE");
    if (!rows.length) throw new Error("Branding row missing");
    await client.query(`UPDATE store_branding SET ${column}=$1, updated_at=NOW() WHERE id=1`, [saved.url]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    await removeLogoFile(saved.fullPath);
    console.error("Save branding:", error);
    return res.status(500).json({ message: "Cannot update branding. Confirm migrations 018 and 019." });
  } finally { client.release(); }
  // Keep old assets after replacement: other tabs may still be using them.
  // A separate, backup-aware cleanup can delete unreferenced images later.
  return res.json({ assetUrl: saved.url, purpose, message: "Brand image updated." });
}

async function clearAsset(_req, res, purpose) {
  try {
    const { rowCount } = await pool.query(
      `UPDATE store_branding SET ${columnByPurpose[purpose]}=NULL, updated_at=NOW() WHERE id=1`
    );
    if (!rowCount) return res.status(503).json({ message: "Missing store branding row." });
    return res.json({ purpose, message: purpose === "favicon" ? "Favicon now follows store icon." : "Default N icon restored. Store name unchanged." });
  } catch (error) {
    console.error("Reset branding:", error);
    return res.status(500).json({ message: "Cannot reset branding." });
  }
}

export const updateLogo = (req, res) => writeAsset(req, res, "icon");
export const resetLogo = (req, res) => clearAsset(req, res, "icon");
export const updateFavicon = (req, res) => writeAsset(req, res, "favicon");
export const resetFavicon = (req, res) => clearAsset(req, res, "favicon");
