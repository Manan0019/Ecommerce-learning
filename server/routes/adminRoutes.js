import { Router } from "express";
import {
  getAdminProfile,
  getCustomers,
  getSummary
} from "../controllers/adminController.js";
import { requireAdmin } from "../middleware/authMiddleware.js";

const router = Router();

router.use(requireAdmin);
router.get("/summary", getSummary);
router.get("/customers", getCustomers);
router.get("/me", getAdminProfile);

export default router;
