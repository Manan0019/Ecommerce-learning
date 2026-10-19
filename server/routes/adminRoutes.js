import { Router } from "express";
import {
  getAdminProfile,
  getCustomers,
  getSummary
} from "../controllers/adminController.js";
import { requireAdmin } from "../middleware/authMiddleware.js";
import { listFeaturedAdmin, searchFeaturedCandidates, reorderFeatured, setFeaturedMembership } from "../controllers/featuredController.js";
import { getLowStock } from "../controllers/inventoryAlertsController.js";

const router = Router();

router.use(requireAdmin);
router.get("/summary", getSummary);
router.get("/featured", listFeaturedAdmin);
router.get("/featured/candidates", searchFeaturedCandidates);
router.put("/featured/order", reorderFeatured);
router.patch("/featured/:id", setFeaturedMembership);
router.get("/inventory/low-stock", getLowStock);
router.get("/customers", getCustomers);
router.get("/me", getAdminProfile);

export default router;
