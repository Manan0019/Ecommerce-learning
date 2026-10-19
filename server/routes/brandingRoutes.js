import { Router } from "express";
import { requireAdmin } from "../middleware/authMiddleware.js";
import { getBranding, updateLogo, resetLogo, updateFavicon, resetFavicon } from "../controllers/brandingController.js";
import { logoUpload, handleLogoUploadError } from "../services/brandingImageService.js";

export const publicBrandingRoutes = Router();
publicBrandingRoutes.get("/", getBranding);

export const adminBrandingRoutes = Router();
adminBrandingRoutes.use(requireAdmin);
adminBrandingRoutes.use((req, res, next) => {
  const origin = req.get("origin");
  const expected = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  if (origin && origin !== expected) return res.status(403).json({ message: "Request origin not allowed." });
  next();
});
// Keep Phase 26 routes valid for older clients; "logo" now means icon-only.
adminBrandingRoutes.put("/logo", logoUpload.single("logo"), updateLogo);
adminBrandingRoutes.delete("/logo", resetLogo);
adminBrandingRoutes.put("/favicon", logoUpload.single("favicon"), updateFavicon);
adminBrandingRoutes.delete("/favicon", resetFavicon);
adminBrandingRoutes.use(handleLogoUploadError);
