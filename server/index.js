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
import addressRoutes from "./routes/addressRoutes.js";
import {requireAdmin} from "./middleware/authMiddleware.js";
import {getCheckoutSettings,updateCheckoutSettings} from "./controllers/checkoutSettingsController.js";
import { customerOrderRoutes, adminOrderRoutes } from "./routes/orderRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import publicCategoryRoutes from "./routes/publicCategoryRoutes.js";
import {publicBannerRoutes,adminBannerRoutes} from "./routes/bannerRoutes.js";
import { publicBrandingRoutes, adminBrandingRoutes } from "./routes/brandingRoutes.js";
import razorpayRoutes from "./routes/razorpayRoutes.js";
import { razorpayWebhook } from "./controllers/razorpayController.js";

import {admin as adminDeliveryRoutes,delivery as deliveryRoutes,notificationRoutes} from './routes/deliveryRoutes.js';

const app = express();
app.disable("x-powered-by");
if(process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
// Signature verification needs exact raw webhook bytes; register BEFORE express.json().
app.post("/api/payments/razorpay/webhook", express.raw({type:"application/json",limit:"256kb"}), razorpayWebhook);
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
app.use("/uploads/categories", express.static(path.join(__dirname, "uploads/categories")));
app.use("/uploads/banners", express.static(path.join(__dirname, "uploads/banners")));
app.use("/uploads/branding", express.static(path.join(__dirname, "uploads/branding")));
app.use("/api/branding", publicBrandingRoutes);
app.use("/api/admin/branding", adminBrandingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin/products", productRoutes);
app.use("/api/admin/categories", categoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", publicProductRoutes);
app.use("/api/categories", publicCategoryRoutes);
app.use("/api/banners",publicBannerRoutes);
app.use("/api/admin/banners",adminBannerRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/addresses",addressRoutes);
// Public, read-only disclosure for product-price and checkout transparency.
// Does not expose merchant tax details, credentials, or editable settings.
app.get("/api/checkout/pricing-policy",async (_req,res)=>{
  try { const {rows}=await pool.query("SELECT tax_pricing_mode FROM store_checkout_settings WHERE id=1");
    if(!rows.length)return res.status(503).json({message:'Checkout policy unavailable.'});
    res.set('Cache-Control','no-store');return res.json({taxPricingMode:rows[0].tax_pricing_mode||'inclusive'});
  } catch(e){console.error('Public pricing policy',e);return res.status(503).json({message:'Checkout pricing policy temporarily unavailable.'});}
});
app.get("/api/admin/checkout-settings",requireAdmin,getCheckoutSettings);
app.put("/api/admin/checkout-settings",requireAdmin,(req,res,next)=>{const origin=req.get('origin');if(origin&&origin!==(process.env.CLIENT_ORIGIN||'http://localhost:5173'))return res.status(403).json({message:'Request origin not allowed.'});next();},updateCheckoutSettings);
app.use("/api/payments/razorpay", razorpayRoutes);
app.use("/api/orders", customerOrderRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/admin/delivery",adminDeliveryRoutes);
app.use("/api/delivery",deliveryRoutes);
app.use("/api/notifications",notificationRoutes);
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
