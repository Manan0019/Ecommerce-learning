import { Router } from "express";
import { listPublicCategories } from "../controllers/categoryController.js";

const router = Router();

router.get("/", listPublicCategories);

export default router;
