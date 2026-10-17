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

import { getAdminMedia,addProductMedia,reorderProductMedia,deleteProductMedia,changeFeatured } from "../controllers/productMediaController.js";
const router = Router();

router.use(requireAdmin);
router.get("/", listAdminProducts);
router.get("/:id", getAdminProduct);
router.post("/", catalogImageUpload.single("image"), createProduct);
router.put("/:id", updateProduct);
router.patch("/:id/status", updateProductStatus);
router.put("/:id/image", catalogImageUpload.single("image"), updateProductImage);
router.get("/:id/media",getAdminMedia);
router.post("/:id/media",catalogImageUpload.single("image"),addProductMedia);
router.put("/:id/media/order",reorderProductMedia);
router.delete("/:id/media/:mediaId",deleteProductMedia);
router.patch("/:id/featured",changeFeatured);
router.use(handleCatalogImageError);

export default router;
