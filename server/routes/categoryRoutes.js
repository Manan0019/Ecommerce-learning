import { Router } from "express";
import {
  createCategory,
  getAdminSpecificationDefinition,
  listAdminCategories,
  updateCategory,
  updateCategoryStatus
} from "../controllers/categoryController.js";
import { requireAdmin } from "../middleware/authMiddleware.js";
import { catalogImageUpload, handleCatalogImageError } from "../services/catalogImageService.js";

const router = Router();

router.use(requireAdmin);
router.get("/", listAdminCategories);
router.get("/:id/specifications", getAdminSpecificationDefinition);
router.post("/", catalogImageUpload.single("image"), createCategory);
router.put("/:id", catalogImageUpload.single("image"), updateCategory);
router.patch("/:id/status", updateCategoryStatus);
router.use(handleCatalogImageError);

export default router;
