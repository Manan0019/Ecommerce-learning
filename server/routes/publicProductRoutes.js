import { Router } from "express";
import { getProduct, listProducts } from "../controllers/publicProductController.js";

const router = Router();

router.get("/", listProducts);
router.get("/:id", getProduct);

export default router;
