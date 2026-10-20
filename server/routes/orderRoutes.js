import { Router } from "express";
import { requireCustomer, requireAdmin } from "../middleware/authMiddleware.js";
import { placeCodOrder, estimateCodOrder, myOrders, adminOrders, changeCodOrderStatus, adminCodSummary, confirmCodCollection } from "../controllers/orderController.js";
function checkWriteOrigin(req, res, next) {
  const origin = req.get("origin");
  const trusted = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  if (origin && origin !== trusted) return res.status(403).json({ message: "Request origin not allowed." });
  return next();
}
const customer = Router();
customer.use(requireCustomer);
customer.post("/cod", checkWriteOrigin, placeCodOrder);
customer.post("/estimate",checkWriteOrigin,estimateCodOrder);
customer.get("/mine", myOrders);
const admin = Router();
admin.use(requireAdmin);
admin.get("/summary", adminCodSummary);
admin.get("/", adminOrders);
admin.patch("/:id/status", checkWriteOrigin, changeCodOrderStatus);
admin.post("/:id/collect", checkWriteOrigin, confirmCodCollection);
export {customer as customerOrderRoutes,admin as adminOrderRoutes};
