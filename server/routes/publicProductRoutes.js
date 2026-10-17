import { listVariants } from "../controllers/variantController.js";
import { Router } from "express";
import {
  getProduct,
  listProducts,
} from "../controllers/publicProductController.js";
import { getProductMedia } from "../controllers/productMediaController.js";
import { listRelatedProducts } from "../controllers/relatedProductController.js";

const router = Router();
router.get("/", listProducts);
router.get("/:id/variants", listVariants);
router.get("/:id/media", getProductMedia);
router.get("/:id/related", listRelatedProducts);
router.get("/:id", getProduct);
export default router;
