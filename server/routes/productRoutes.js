import { Router } from "express";
import {
  createProduct,
  getAdminProduct,
  listAdminProducts,
  updateProduct,
  updateProductImage,
  updateProductStatus
} from "../controllers/productController.js";
import { requireAdmin } from "../middleware/authMiddleware.js";
import { catalogImageUpload, handleCatalogImageError } from "../services/catalogImageService.js";

const router = Router();

router.use(requireAdmin);
router.get("/", listAdminProducts);
router.get("/:id", getAdminProduct);
router.post("/", catalogImageUpload.single("image"), createProduct);
router.put("/:id", updateProduct);
router.patch("/:id/status", updateProductStatus);
router.put("/:id/image", catalogImageUpload.single("image"), updateProductImage);
router.use(handleCatalogImageError);

export default router;
