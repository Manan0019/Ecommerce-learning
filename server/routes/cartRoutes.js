import { Router } from "express";
import { quoteCart } from "../controllers/cartController.js";

const router = Router();

router.post("/quote", quoteCart);

export default router;
