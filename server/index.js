import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pool from "./config/db.js";
import { sessionMiddleware } from "./config/session.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import publicProductRoutes from "./routes/publicProductRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import { customerOrderRoutes, adminOrderRoutes } from "./routes/orderRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import publicCategoryRoutes from "./routes/publicCategoryRoutes.js";
import {publicBannerRoutes,adminBannerRoutes} from "./routes/bannerRoutes.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(sessionMiddleware);
app.get("/", (_req, res) => res.json({ message: "Ecommerce API is running." }));
app.get("/api/db-test", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT NOW() AS database_time");
    res.json({ success: true, databaseTime: rows[0].database_time });
  } catch (error) {
    console.error("DB test:", error);
    res.status(500).json({ success: false, message: "Database connection failed." });
  }
});
app.use("/uploads/products", express.static(path.join(__dirname, "uploads/products")));
app.use("/uploads/profiles", express.static(path.join(__dirname, "uploads/profiles")));
app.use("/uploads/categories", express.static(path.join(__dirname, "uploads/categories")));
app.use("/uploads/banners", express.static(path.join(__dirname, "uploads/banners")));
app.use("/api/auth", authRoutes);
app.use("/api/admin/products", productRoutes);
app.use("/api/admin/categories", categoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", publicProductRoutes);
app.use("/api/categories", publicCategoryRoutes);
app.use("/api/banners",publicBannerRoutes);
app.use("/api/admin/banners",adminBannerRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", customerOrderRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use((error, _req, res, _next) => {
  console.error("Unhandled Express error:", error);
  res.status(500).json({ message: "Internal server error." });
});
async function start() {
  try {
    await pool.query("SELECT 1");
    app.listen(PORT, () => console.log(`Express running at http://localhost:${PORT}`));
  } catch (error) {
    console.error("Cannot start Express (database unavailable):", error);
    process.exitCode = 1;
    await pool.end();
  }
}
start();
