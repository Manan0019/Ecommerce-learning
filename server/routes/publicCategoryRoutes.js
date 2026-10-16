import { Router } from "express";
import {
  getPublicSpecificationDefinition,
  listPublicCategories
} from "../controllers/categoryController.js";

const router = Router();

router.get("/", listPublicCategories);
router.get("/:id/specifications", getPublicSpecificationDefinition);

export default router;
