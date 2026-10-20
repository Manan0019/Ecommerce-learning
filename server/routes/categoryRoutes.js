import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getAdminSpecificationDefinition,
  listAdminCategories,
  updateCategory,
  updateCategoryStatus
} from "../controllers/categoryController.js";
import { requireAdmin } from "../middleware/authMiddleware.js";
import { categoryImageUpload, handleCatalogImageError } from "../services/catalogImageService.js";

const router = Router();

router.use(requireAdmin);
router.get("/", listAdminCategories);
router.get("/:id/specifications", getAdminSpecificationDefinition);
router.post("/", categoryImageUpload.fields([{ name: "image", maxCount: 1 }, { name: "menuIcon", maxCount: 1 }]), createCategory);
router.put("/:id", categoryImageUpload.fields([{ name: "image", maxCount: 1 }, { name: "menuIcon", maxCount: 1 }]), updateCategory);
router.patch("/:id/status", updateCategoryStatus);
router.delete("/:id", deleteCategory);
router.use(handleCatalogImageError);

export default router;
