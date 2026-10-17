import { Router } from "express";
import { getProduct, listProducts } from "../controllers/publicProductController.js";

import { getProductMedia } from "../controllers/productMediaController.js";
const router = Router();

router.get("/", listProducts);
router.get("/:id/media", getProductMedia);
router.get("/:id", getProduct);

export default router;
